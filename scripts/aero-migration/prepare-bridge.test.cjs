'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {utils}=require('ethers')
const {validateManifest,buildDeployConfig,prepareBridge,verifyNewWrapper,writePlan,securityState,digest,toolchain}=require('./prepare-bridge.cjs')
const baseline=require('../../docs/aero-existing-hyperlane-route.json')
const template=require('./bridge-manifest.example.json')
const clone=x=>JSON.parse(JSON.stringify(x))
const h='0x'+'ab'.repeat(32),runtime='0x6001600055',wrapper='0x1111111111111111111111111111111111111111'
function manifest(){const m=clone(template);m.reviewed=true;m.reviewReference='unit-test-only-not-production';m.wrapper={address:wrapper,runtimeCodeHash:utils.keccak256(runtime),transactionHash:h,blockNumber:5,blockHash:h};for(const n of ['base','optimism']){m.chains[n].securityReviewed=true;m.chains[n].destinationGas=200000}return m}
test('requires actual new wrapper, explicit review, deployment evidence and gas budgets',()=>{
    assert.throws(()=>validateManifest(template,baseline),/Reviewed/)
    for(const mutate of [m=>m.wrapper.address='0x10398AbC267496E49106B07dd6BE13364D10dC71',m=>m.wrapper.transactionHash=null,
        m=>m.chains.base.securityReviewed=false,m=>m.chains.base.destinationGas=null,m=>m.chains.base.proxyAdminOwner=wrapper,
        m=>m.routeId='AERO/optimism',m=>m.chains.base.legacySecurityHash='0'.repeat(64)]){
        const m=manifest();mutate(m);assert.throws(()=>validateManifest(m,baseline))
    }
})
test('preserves selected legacy security, makes a distinct collateral/synthetic pair with zero initial supply',()=>{
    const m=manifest(),c=buildDeployConfig(m,baseline)
    assert.equal(c.base.token,wrapper);assert.equal(c.base.type,'collateral');assert.equal(c.optimism.type,'synthetic');assert.equal(c.optimism.initialSupply,'0')
    for(const n of ['base','optimism']){
        assert.equal(c[n].owner,utils.getAddress(baseline.routes[n].router.owner))
        assert.equal(c[n].proxyAdmin.owner,c[n].owner);assert.equal(c[n].proxyAdmin.address,undefined)
        assert.equal(c[n].interchainSecurityModule,baseline.routes[n].router.effectiveIsm)
        assert.equal(c[n].hook,'0x0000000000000000000000000000000000000000')
        assert.equal(c[n].foreignDeployment,undefined);assert.equal(c[n].remoteRouters,undefined)
    }
    assert.equal(c.optimism.token,undefined)
})
test('new nested security or administration changes stop preparation before wrapper verification',async()=>{
    const m=manifest(),changed=clone(baseline);changed.routes.base.security.ismTree.threshold=2
    await assert.rejects(prepareBridge(m,baseline,{inventoryBridge:async()=>changed,verifyNewWrapper:async()=>{throw Error('should not reach wrapper')},rpc:async()=>{}}),/changed since review/)
})
test('unchanged live state produces a review plan without supplying router addresses or executing transactions',async()=>{
    const m=manifest(),calls=[]
    const result=await prepareBridge(m,baseline,{inventoryBridge:async()=>clone(baseline),verifyNewWrapper:async()=>m.wrapper,
        rpc:async(_url,method,args)=>{calls.push(method);return method==='eth_getBlockByNumber'?{hash:Object.values(baseline.routes).find(r=>'0x'+r.blockNumber.toString(16)===args[0]).blockHash}:method==='eth_getCode'?'0x':'0x1'}})
    assert.equal(result.activationReady,false);assert.equal(result.unsigned,true)
    assert(calls.every(m=>['eth_getBalance','eth_getTransactionCount','eth_getCode','eth_getBlockByNumber'].includes(m)))
    assert.equal(result.deployConfig.base.address,undefined);assert.equal(result.deployConfig.optimism.address,undefined)
    assert.equal(result.administration.base.ownershipChanges,false)
})
function wrapperRpc(){
    const values={'BASE_TOKEN()':'0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee','BASE_TOKEN_NFT()':'0xBF7977E1521e9a3032bf7243Ee4712f311f13915',
        'treasury()':'0x7F4735237c41F7F8578A9C7d10A11e3BCFa3D4A3','decimals()':'18','name()':'haiAERO','symbol()':'haiAERO','owner()':template.deployerAddress,'paused()':true}
    const receipt={status:'0x1',transactionHash:h,contractAddress:wrapper,blockNumber:'0x5',blockHash:h}
    return {values,receipt,clients:{rpc:async(_url,method,args)=>{
        if(method==='eth_getCode')return args[1]==='0x4'?'0x':runtime
        if(method==='eth_getStorageAt')return '0x'+'00'.repeat(32)
        if(method==='eth_getTransactionReceipt')return receipt
        if(method==='eth_getBlockByNumber')return {hash:h}
        throw Error('Unexpected RPC '+method)
    },read:async(_url,_tag,_addr,signature)=>[values[signature.match(/^([^(]+\(\))/)[1]]]} }
}
test('wrapper proof requires real finalized direct creation and new AERO/sAERO/treasury bindings',async()=>{
    const f=wrapperRpc(),m=manifest();assert.equal((await verifyNewWrapper(m.wrapper,{blockNumber:20},f.clients)).address,wrapper)
    f.receipt.contractAddress=null;await assert.rejects(verifyNewWrapper(m.wrapper,{blockNumber:20},f.clients),/creation receipt/)
    f.receipt.contractAddress=wrapper;f.values['BASE_TOKEN()']='0x10398AbC267496E49106B07dd6BE13364D10dC71'
    await assert.rejects(verifyNewWrapper(m.wrapper,{blockNumber:20},f.clients),/new AERO/)
})
test('isolated output pins CLI integrity, excludes credentials and refuses artifact overwrite',()=>{
    const base=fs.mkdtempSync(path.join(os.tmpdir(),'hai-bridge-test-')),out=path.join(base,'packet'),m=manifest()
    try{
        writePlan(out,m,{deployConfig:buildDeployConfig(m,baseline),unsigned:true})
        const command=JSON.parse(fs.readFileSync(path.join(out,'cli-command.json')))
        assert.equal(command.executable,'node');assert(command.arguments.includes('--warp-route-id'));assert(!command.arguments.includes('--config'))
        assert(!command.arguments.some(v=>/--yes|--key|--skip/.test(v)))
        const lock=JSON.parse(fs.readFileSync(path.join(out,'package-lock.json')))
        assert.equal(lock.packages['node_modules/@hyperlane-xyz/cli'].integrity,toolchain.cli.integrity)
        assert(!/"apiKey"|"privateKey"|"secret"/.test(JSON.stringify(toolchain)))
        assert.equal(JSON.parse(fs.readFileSync(path.join(out,'registry/warp_routes/'+m.routeId+'-deploy.yaml'))).base.token,wrapper)
        assert.throws(()=>writePlan(out,m,{deployConfig:{}}),/EEXIST/)
    }finally{fs.rmSync(base,{recursive:true,force:true})}
})
test('security fingerprints include validator and trusted-relayer configuration, excluding changing supply',()=>{
    const route=clone(baseline.routes.optimism),before=digest(securityState(route));route.router.totalSupply='123';assert.equal(digest(securityState(route)),before)
    route.security.ismTree.modules[0].trustedRelayer=wrapper;assert.notEqual(digest(securityState(route)),before)
    const hookChanged=clone(baseline.routes.base);hookChanged.security.hookTree.owner=wrapper
    assert.notEqual(digest(securityState(hookChanged)),digest(securityState(baseline.routes.base)))
    const authorityChanged=clone(baseline.routes.base);authorityChanged.router.ownerIdentity.runtimeCodeHash=h
    assert.notEqual(digest(securityState(authorityChanged)),digest(securityState(baseline.routes.base)))
})

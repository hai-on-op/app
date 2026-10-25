'use strict'
// Produces a new isolated registry for a pinned Hyperlane CLI. Never executes that CLI or signs.
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { utils } = require('ethers')
const { SAFE, ZERO, CHAINS, assert, rpc, read } = require('./lib.cjs')
const { inventoryBridge, LEGACY_ROUTERS, IMPLEMENTATION_SLOT, ADMIN_SLOT, BEACON_SLOT, same } = require('./bridge-inventory.cjs')
const toolchain = require('./hyperlane-toolchain.json')
const DEPLOYER = '0xbd8EC4cb226EBaE228F8829E2ec23070b09165d3'
const AERO = '0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee'
const SAERO = '0xBF7977E1521e9a3032bf7243Ee4712f311f13915'
const LEGACY_BASE_TOKEN = '0x10398AbC267496E49106B07dd6BE13364D10dC71'
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value
const digest = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')
const bytesHash = bytes => createHash('sha256').update(bytes).digest('hex')
const address = value => { assert(utils.isAddress(value) && !same(value, ZERO), 'Explicit nonzero address required'); return utils.getAddress(value) }
const hash = value => { assert(/^0x[0-9a-f]{64}$/i.test(value), 'Explicit transaction/block/runtime hash required'); return value }
function securityState(route) {
    const r = route.router
    return { router: { address:r.address, runtimeCodeHash:r.runtimeCodeHash, implementation:r.implementation,
        proxyAdmin:r.proxyAdmin, proxyAdminRuntimeCodeHash:r.proxyAdminRuntimeCodeHash, proxyAdminOwner:r.proxyAdminOwner,
        proxyAdminOwnerIdentity:r.proxyAdminOwnerIdentity, owner:r.owner, ownerIdentity:r.ownerIdentity, mailbox:r.mailbox,
        hook:r.hook, effectiveHook:r.effectiveHook, interchainSecurityModule:r.interchainSecurityModule,
        effectiveIsm:r.effectiveIsm }, mailbox:route.mailbox, security:route.security, remoteRouters:route.remoteRouters }
}
function validateManifest(manifest, baseline) {
    assert(manifest?.schemaVersion === 1 && manifest.reviewed === true, 'Reviewed bridge manifest required')
    assert(typeof manifest.reviewReference === 'string' && manifest.reviewReference.trim().length >= 8, 'Review reference required')
    assert(/^[a-zA-Z0-9.*]+\/[a-z0-9-]+$/.test(manifest.routeId || ''), 'Explicit distinct registry route ID required')
    assert(!['AERO/optimism','haiAERO/base-optimism'].includes(manifest.routeId), 'Legacy registry route ID cannot be reused')
    assert(same(address(manifest.deployerAddress),DEPLOYER), 'Confirmed bridge deployer required')
    const token = address(manifest.wrapper?.address)
    assert(![LEGACY_BASE_TOKEN,AERO,SAERO,...Object.values(LEGACY_ROUTERS)].some(a=>same(a,token)), 'Actual new HAI issuer required; legacy and underlying assets are forbidden')
    hash(manifest.wrapper.runtimeCodeHash); hash(manifest.wrapper.transactionHash); hash(manifest.wrapper.blockHash)
    assert(Number.isSafeInteger(manifest.wrapper.blockNumber) && manifest.wrapper.blockNumber > 0, 'Actual wrapper deployment block required')
    assert(baseline?.schemaVersion === 1 && baseline.routes?.base && baseline.routes?.optimism, 'Pinned legacy route inventory required')
    for (const network of ['base','optimism']) {
        const c = manifest.chains?.[network], old = baseline.routes[network]
        assert(c && c.securityPolicy === 'preserve-observed' && c.securityReviewed === true, 'Explicit reviewed preserve-observed security policy required')
        assert(c.legacySecurityHash === digest(securityState(old)), 'Reviewed legacy security fingerprint mismatch')
        address(c.routerOwner); address(c.proxyAdminOwner)
        // Initial deployment has a single ownership handoff. Split administration needs a separate reviewed flow.
        assert(same(c.routerOwner,c.proxyAdminOwner), 'This initial deployment requires equal explicit router and proxy-admin owners')
        assert(same(c.routerOwner,DEPLOYER), 'Confirmed existing bridge administration required')
        assert(c.hookPolicy === 'mailbox-default' && same(old.router.hook,ZERO), 'This preparer preserves the existing mailbox-default hook behavior')
        assert(Number.isSafeInteger(c.destinationGas) && c.destinationGas > 0 && c.destinationGas <= 10000000, 'Explicit simulated destination gas budget required')
    }
    return manifest
}
function buildDeployConfig(manifest, baseline) {
    validateManifest(manifest,baseline)
    const config = {}
    for (const [network,remote] of [['base','optimism'],['optimism','base']]) {
        const c=manifest.chains[network],old=baseline.routes[network]
        config[network] = { type:network==='base'?'collateral':'synthetic', owner:address(c.routerOwner),
            proxyAdmin:{owner:address(c.proxyAdminOwner)}, mailbox:old.mailbox.address,
            interchainSecurityModule:old.router.effectiveIsm, hook:ZERO,
            name:'haiAERO',symbol:'haiAERO',decimals:18,
            destinationGas:{[String(CHAINS[remote].id)]:String(c.destinationGas)} }
        if(network==='base')config[network].token=address(manifest.wrapper.address)
        else config[network].initialSupply='0'
    }
    return config
}
async function verifyNewWrapper(wrapper, snapshot, clients={rpc,read}) {
    const url=CHAINS.base.rpc(),tag='0x'+snapshot.blockNumber.toString(16),token=address(wrapper.address)
    const code=await clients.rpc(url,'eth_getCode',[token,tag])
    assert(code!=='0x'&&same(utils.keccak256(code),wrapper.runtimeCodeHash),'New wrapper runtime mismatch')
    for(const slot of [IMPLEMENTATION_SLOT,ADMIN_SLOT,BEACON_SLOT]) assert(BigInt(await clients.rpc(url,'eth_getStorageAt',[token,slot,tag]))===0n,'Issuer must be the reviewed non-proxy HAI contract')
    const receipt=await clients.rpc(url,'eth_getTransactionReceipt',[wrapper.transactionHash])
    assert(receipt && Number(receipt.status)===1 && same(receipt.transactionHash,wrapper.transactionHash)
        && same(receipt.contractAddress,token) && Number(receipt.blockNumber)===wrapper.blockNumber
        && same(receipt.blockHash,wrapper.blockHash) && wrapper.blockNumber<=snapshot.blockNumber,'Finalized direct wrapper creation receipt required')
    const created=await clients.rpc(url,'eth_getBlockByNumber',[receipt.blockNumber,false])
    assert(created && same(created.hash,wrapper.blockHash),'Wrapper creation block changed')
    assert(await clients.rpc(url,'eth_getCode',[token,'0x'+(wrapper.blockNumber-1).toString(16)])==='0x','Wrapper existed before claimed deployment')
    assert(same(utils.keccak256(await clients.rpc(url,'eth_getCode',[token,receipt.blockNumber])),wrapper.runtimeCodeHash),'Wrapper creation runtime mismatch')
    const scalar=async s=>(await clients.read(url,tag,token,s))[0].toString()
    assert(same(await scalar('BASE_TOKEN() view returns(address)'),AERO),'Wrapper must hold new AERO')
    assert(same(await scalar('BASE_TOKEN_NFT() view returns(address)'),SAERO),'Wrapper must stake in verified sAERO')
    assert(same(await scalar('treasury() view returns(address)'),SAFE),'NFT custody treasury differs from reviewed issuer')
    const owner=await scalar('owner() view returns(address)')
    assert(same(owner,SAFE),'Issuer owner must be the confirmed treasury Safe')
    assert(await scalar('deploymentChainId() view returns(uint256)')===String(CHAINS.base.id),'Issuer deployment chain must be Base')
    assert(await scalar('decimals() view returns(uint8)')==='18' && await scalar('name() view returns(string)')==='haiAERO'
        && await scalar('symbol() view returns(string)')==='haiAERO','Wrapper metadata differs from new route')
    return {address:token,runtimeCodeHash:wrapper.runtimeCodeHash,transactionHash:wrapper.transactionHash,blockNumber:wrapper.blockNumber,blockHash:wrapper.blockHash,
        owner,paused:await scalar('paused() view returns(bool)'),deploymentChainId:CHAINS.base.id,treasury:SAFE,underlying:AERO,escrow:SAERO}
}
async function prepareBridge(manifest, baseline, dependencies={inventoryBridge,verifyNewWrapper,rpc}) {
    validateManifest(manifest,baseline)
    const live=await dependencies.inventoryBridge()
    for(const network of ['base','optimism']) {
        assert(digest(securityState(live.routes[network]))===manifest.chains[network].legacySecurityHash,'Legacy security or administration changed since review')
        assert(live.routes[network].chainId===CHAINS[network].id && Number(live.routes[network].mailbox.localDomain)===CHAINS[network].id,'Chain/domain identity mismatch')
        const registered=toolchain.registry.chains[network].addresses.mailbox
        assert(same(registered,live.routes[network].mailbox.address),'Pinned official registry mailbox differs from selected route')
    }
    const wrapper=await dependencies.verifyNewWrapper(manifest.wrapper,live.routes.base)
    const deployer={address:address(manifest.deployerAddress),chains:{}}
    for(const network of ['base','optimism']) {
        const tag='0x'+live.routes[network].blockNumber.toString(16),url=CHAINS[network].rpc()
        deployer.chains[network]={nativeBalanceWei:BigInt(await dependencies.rpc(url,'eth_getBalance',[deployer.address,tag])).toString(),
            nonce:Number(await dependencies.rpc(url,'eth_getTransactionCount',[deployer.address,tag])),
            hasCode:await dependencies.rpc(url,'eth_getCode',[deployer.address,tag])!=='0x'}
        const canonical=await dependencies.rpc(url,'eth_getBlockByNumber',[tag,false])
        assert(canonical && same(canonical.hash,live.routes[network].blockHash),'Preparation snapshot changed')
    }
    return {schemaVersion:1,unsigned:true,routeId:manifest.routeId,toolchain:{cli:toolchain.cli,registryCommit:toolchain.registry.commit},
        wrapper,deployer,legacyInventory:live,deployConfig:buildDeployConfig(manifest,live),
        administration:Object.fromEntries(['base','optimism'].map(network=>[network,{previousOwner:live.routes[network].router.owner,
            selectedOwner:manifest.chains[network].routerOwner,previousProxyAdminOwner:live.routes[network].router.proxyAdminOwner,
            selectedProxyAdminOwner:manifest.chains[network].proxyAdminOwner,ownershipChanges:!same(live.routes[network].router.owner,manifest.chains[network].routerOwner)}])),
        activationReady:false,requirements:['Run the pinned CLI with the explicitly selected deployer and reviewed gas budgets.',
            'Record successful creation receipts, finalized runtime hashes, new router pair and fresh proxy-admin ownership; confirm no legacy addresses reused.',
            'Verify effective ISM and hook, remote enrollment, mailbox domains and zero initial synthetic supply.',
            'Complete message-specific two-way small-transfer rehearsal and bridge escrow/synthetic reconciliation before app activation.']}
}
function writePlan(output,manifest,result) {
    // Isolated directory prevents adopting local/global cached legacy route artifacts.
    fs.mkdirSync(output)
    const write=(file,value)=>{const dest=path.join(output,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'})}
    for(const network of ['base','optimism'])for(const kind of ['metadata','addresses'])write(`registry/chains/${network}/${kind}.yaml`,toolchain.registry.chains[network][kind])
    write(`registry/warp_routes/${manifest.routeId}-deploy.yaml`,result.deployConfig)
    write('plan.json',result)
    write('reviewed-manifest.json',manifest)
    const packageName='hai-aero-bridge-preparation'
    write('package.json',{name:packageName,version:'0.0.0',private:true,devDependencies:{[toolchain.cli.package]:toolchain.cli.version}})
    write('package-lock.json',{name:packageName,version:'0.0.0',lockfileVersion:3,requires:true,packages:{
        '':{name:packageName,version:'0.0.0',devDependencies:{[toolchain.cli.package]:toolchain.cli.version}},
        'node_modules/@hyperlane-xyz/cli':{version:toolchain.cli.version,resolved:toolchain.cli.tarball,integrity:toolchain.cli.integrity,dev:true,license:'Apache-2.0',bin:{hyperlane:'bundle/index.js'},engines:{node:'>=22'}}}})
    write('cli-command.json',{executable:'node',arguments:['node_modules/@hyperlane-xyz/cli/bundle/index.js','warp','deploy',
        '--warp-route-id',manifest.routeId,'--registry',path.resolve(output,'registry')],cwd:path.resolve(output),
        executesTransactions:true,executedByGenerator:false,expectedDeployer:manifest.deployerAddress,packageIntegrity:toolchain.cli.integrity})
    write('README.txt',`Unsigned preparation only. No deployment occurred.\nThe user will deploy when ready. This generator grants no deployment authorization.\nInstall the integrity-pinned CLI with npm ci --ignore-scripts in this directory; it has no package dependencies.\nUse cli-command.json with the reviewed signer only after checking plan.json.\nDo not add --yes, --skip-confirmation, a private key argument, or another registry.\nCLI ${toolchain.cli.version} uses --warp-route-id and the isolated local registry, not --config.\nThe new router and proxy-admin addresses do not exist in this plan and must be recorded from actual finalized deployment receipts.\n`)
}
async function main() {
    const [manifestPath,output]=process.argv.slice(2)
    assert(manifestPath&&output&&process.argv.length===4,'Usage: node prepare-bridge.cjs REVIEWED_MANIFEST.json NEW_OUTPUT_DIRECTORY')
    const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'))
    const inventoryPath=path.resolve(path.dirname(manifestPath),manifest.legacyInventory?.file||'')
    const bytes=fs.readFileSync(inventoryPath)
    assert(bytesHash(bytes)===manifest.legacyInventory.sha256,'Legacy inventory file hash mismatch')
    const baseline=JSON.parse(bytes),result=await prepareBridge(manifest,baseline)
    writePlan(output,manifest,result)
    console.log(JSON.stringify({output,routeId:manifest.routeId,unsigned:true,activationReady:false}))
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1})
module.exports={securityState,digest,bytesHash,validateManifest,buildDeployConfig,verifyNewWrapper,prepareBridge,writePlan,toolchain}

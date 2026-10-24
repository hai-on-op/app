'use strict'
// Read-only legacy-route inventory. No signer or transaction submission.
const fs = require('node:fs')
const { utils } = require('ethers')
const { SAFE, ZERO, CHAINS, assert, rpc: rawRpc, read: rawRead } = require('./lib.cjs')
const LEGACY_ROUTERS = { base: '0xD605046D24CdaD37Ca2Dff3aa8Ebf254CeEe86d5', optimism: '0xbdF4A4Cc124d9A83a5774574fcBE45DC5d1f1152' }
const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103'
const BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'
async function retryRead(operation) {
  for(let attempt=0;;attempt++) { try { return await operation() } catch(error) {
    if(attempt>=3 || !/HTTP (429|502|503)/.test(error.message)) throw error
    await new Promise(resolve=>setTimeout(resolve,1000 * 2 ** attempt))
  }}
}
const rpc = (...args) => retryRead(()=>rawRpc(...args))
const read = (...args) => retryRead(()=>rawRead(...args))
const same = (a,b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase()
const slotAddress = value => utils.getAddress('0x' + value.slice(-40))
async function captureRoute(network) {
  const chain = CHAINS[network], router = LEGACY_ROUTERS[network]
  assert(chain && router, 'Unsupported route network')
  const url = chain.rpc()
  assert(Number(await rpc(url,'eth_chainId',[])) === chain.id, 'Wrong RPC chain')
  const b = await rpc(url,'eth_getBlockByNumber',['finalized',false]); assert(b?.hash,'Finalized block unavailable')
  const tag = b.number, call = async (a,s,args=[]) => {try{return await read(url,tag,a,s,args)}catch{throw new Error(`Read failed: ${s} at ${a}`)}}
  const scalar = async (a,s,args=[]) => (await call(a,s,args))[0].toString()
  const identity = async a => { const code = await rpc(url,'eth_getCode',[a,tag]); assert(code !== '0x','Missing deployed dependency'); return {address:a,runtimeCodeHash:utils.keccak256(code)} }
  const proxiedIdentity = async a => {
    const result = await identity(a)
    const [is,as,bs] = await Promise.all([IMPLEMENTATION_SLOT,ADMIN_SLOT,BEACON_SLOT].map(s=>rpc(url,'eth_getStorageAt',[a,s,tag])))
    assert(same(slotAddress(bs),ZERO),'Beacon dependency needs separate review')
    if (!same(slotAddress(is),ZERO)) result.implementation = await identity(slotAddress(is))
    if (!same(slotAddress(as),ZERO)) { result.proxyAdmin = slotAddress(as); const code = await rpc(url,'eth_getCode',[result.proxyAdmin,tag]); if (code !== '0x') { result.proxyAdminRuntimeCodeHash=utils.keccak256(code); result.proxyAdminOwner=await scalar(result.proxyAdmin,'owner() view returns(address)') } }
    return result
  }
  const authority = async address => {
    const code = await rpc(url,'eth_getCode',[address,tag])
    const result = {address,runtimeCodeHash:utils.keccak256(code),isContract:code !== '0x'}
    if (code !== '0x') {
      try { result.safeOwners=(await call(address,'getOwners() view returns(address[])'))[0]; result.safeThreshold=await scalar(address,'getThreshold() view returns(uint256)') }
      catch { result.safeIntrospection='not available' }
    }
    return result
  }
  const ismTree = async (address, origin, ancestors=[]) => {
    assert(ancestors.length < 10 && !ancestors.some(a=>same(a,address)),'ISM dependency cycle/depth exceeded')
    const result = await proxiedIdentity(address), next=[...ancestors,address]
    result.moduleType=Number(await scalar(address,'moduleType() view returns(uint8)'))
    const message=utils.solidityPack(['uint8','uint32','uint32','bytes32','uint32','bytes32','bytes'],[3,0,origin,utils.hexZeroPad(LEGACY_ROUTERS[network==='base'?'optimism':'base'],32),chain.id,utils.hexZeroPad(router,32),'0x'])
    if(result.moduleType === 2) {
      const [modules,threshold]=await call(address,'modulesAndThreshold(bytes) view returns(address[],uint8)',[message])
      result.threshold=Number(threshold); result.modules=[]
      assert(result.threshold>0 && result.threshold<=modules.length,'Invalid aggregation threshold')
      for(const module of modules) result.modules.push(await ismTree(module,origin,next))
    } else if(result.moduleType === 1) {
      result.owner=await scalar(address,'owner() view returns(address)')
      result.domains=(await call(address,'domains() view returns(uint256[])'))[0].map(v=>v.toString())
      const module=await scalar(address,'route(bytes) view returns(address)',[message])
      result.selectedOrigin=origin; result.selectedModule=await ismTree(module,origin,next)
      try {result.mailbox=await scalar(address,'mailbox() view returns(address)')}catch{}
    } else if([4,5].includes(result.moduleType)) {
      const [validators,threshold]=await call(address,'validatorsAndThreshold(bytes) view returns(address[],uint8)',[message])
      result.validators=validators; result.threshold=Number(threshold)
      assert(result.threshold>0 && result.threshold<=validators.length,'Invalid validator threshold')
    } else if(result.moduleType === 6) {
      // NULL module type also includes insecure test ISMs: require the actual trusted-relayer getters.
      try {
        result.trustedRelayer=await scalar(address,'trustedRelayer() view returns(address)')
        result.mailbox=await scalar(address,'mailbox() view returns(address)')
        assert(!same(result.trustedRelayer,ZERO),'Zero trusted relayer')
      } catch {
        result.owner=await scalar(address,'owner() view returns(address)')
        result.paused=(await call(address,'paused() view returns(bool)'))[0]
        result.variant='pausable'
      }
    } else throw new Error('Unsupported legacy ISM type: separate security inventory required')
    return result
  }
  const hookTree = async (address,destination,ancestors=[]) => {
    assert(ancestors.length<10 && !ancestors.some(a=>same(a,address)),'Hook dependency cycle/depth exceeded')
    const result=await proxiedIdentity(address),next=[...ancestors,address]
    result.hookType=Number(await scalar(address,'hookType() view returns(uint8)'))
    if([1,5].includes(result.hookType)) {
      result.owner=await scalar(address,'owner() view returns(address)')
      result.selectedDestination=destination
      result.destinationHook=await scalar(address,'hooks(uint32) view returns(address)',[destination])
      if(result.hookType===5)result.fallbackHook=await hookTree(await scalar(address,'fallbackHook() view returns(address)'),destination,next)
      const selected=same(result.destinationHook,ZERO)?result.fallbackHook?.address:result.destinationHook
      assert(selected,'No selected destination hook')
      result.selectedHook=await hookTree(selected,destination,next)
    } else if(result.hookType===2) {
      result.hooks=[]
      for(const child of (await call(address,'hooks(bytes) view returns(address[])',['0x']))[0])result.hooks.push(await hookTree(child,destination,next))
      assert(result.hooks.length>0,'Empty aggregation hook')
    } else if(result.hookType===4) {
      result.owner=await scalar(address,'owner() view returns(address)')
      result.beneficiary=await scalar(address,'beneficiary() view returns(address)')
      const [oracle,overhead]=await call(address,'destinationGasConfigs(uint32) view returns(address,uint96)',[destination])
      result.selectedDestination=destination;result.gasOverhead=overhead.toString()
      result.gasOracle=await proxiedIdentity(oracle)
      result.gasOracle.owner=await scalar(oracle,'owner() view returns(address)')
    } else if(result.hookType===7) {
      result.owner=await scalar(address,'owner() view returns(address)');result.paused=(await call(address,'paused() view returns(bool)'))[0]
    } else if(result.hookType===8) {
      for(const [name,type]of [['owner','address'],['beneficiary','address'],['MAX_PROTOCOL_FEE','uint256'],['protocolFee','uint256']])result[name]=await scalar(address,`${name}() view returns(${type})`)
    } else if(result.hookType===3) {
      result.mailbox=await scalar(address,'mailbox() view returns(address)')
    } else throw new Error('Unsupported legacy hook type: separate security inventory required')
    return result
  }
  const result = {network,chainId:chain.id,blockNumber:Number(tag),blockHash:b.hash,timestamp:Number(b.timestamp),router:await proxiedIdentity(router)}
  result.router.owner=await scalar(router,'owner() view returns(address)')
  result.router.ownerIdentity=await authority(result.router.owner)
  if(result.router.proxyAdminOwner) result.router.proxyAdminOwnerIdentity=await authority(result.router.proxyAdminOwner)
  result.router.mailbox=await scalar(router,'mailbox() view returns(address)')
  result.router.hook=await scalar(router,'hook() view returns(address)')
  result.router.interchainSecurityModule=await scalar(router,'interchainSecurityModule() view returns(address)')
  result.mailbox=await proxiedIdentity(result.router.mailbox)
  for(const [name,type]of [['owner','address'],['localDomain','uint32'],['defaultIsm','address'],['defaultHook','address'],['requiredHook','address']]) result.mailbox[name]=await scalar(result.mailbox.address,`${name}() view returns(${type})`)
  result.router.effectiveIsm=await scalar(result.mailbox.address,'recipientIsm(address) view returns(address)',[router])
  result.router.effectiveHook=same(result.router.hook,ZERO)?result.mailbox.defaultHook:result.router.hook
  result.security={ism:await proxiedIdentity(result.router.effectiveIsm),hook:await proxiedIdentity(result.router.effectiveHook),requiredHook:await proxiedIdentity(result.mailbox.requiredHook)}
  result.security.ismTree=await ismTree(result.security.ism.address,network === 'base' ? 10 : 8453)
  result.security.hookTree=await hookTree(result.security.hook.address,network === 'base' ? 10 : 8453)
  result.security.requiredHookTree=await hookTree(result.security.requiredHook.address,network === 'base' ? 10 : 8453)
  const domains=(await call(router,'domains() view returns(uint32[])'))[0]
  result.remoteRouters=[]
  for(const domain of domains) result.remoteRouters.push({domain:Number(domain),router:await scalar(router,'routers(uint32) view returns(bytes32)',[domain]),destinationGas:await scalar(router,'destinationGas(uint32) view returns(uint256)',[domain])})
  if(network==='base')result.router.wrappedToken=await scalar(router,'wrappedToken() view returns(address)')
  else for(const [name,type]of [['decimals','uint8'],['symbol','string'],['name','string'],['totalSupply','uint256']]) result.router[name]=await scalar(router,`${name}() view returns(${type})`)
  const canonical=await rpc(url,'eth_getBlockByNumber',[tag,false]);assert(canonical.hash===b.hash,'Snapshot changed')
  return result
}
async function inventoryBridge() {
  const routes={};for(const n of Object.keys(LEGACY_ROUTERS)) routes[n]=await captureRoute(n)
  for(const [from,to] of [['base','optimism'],['optimism','base']]){
    const remotes=routes[from].remoteRouters;assert(remotes.length===1&&remotes[0].domain===Number(routes[to].mailbox.localDomain)&&same(remotes[0].router,utils.hexZeroPad(LEGACY_ROUTERS[to],32)),'Legacy route pairing mismatch')
  }
  return {schemaVersion:1,capturedAt:new Date().toISOString(),treasury:SAFE,routes,reviewedForReuse:false,note:'Observed legacy security is evidence only. Explicit policy review is required before using any mailbox, hook or ISM for a new route.'}
}
if(require.main===module) inventoryBridge().then(result=>{assert(process.argv[2],'Usage: node bridge-inventory.cjs NEW_OUTPUT.json');fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output:process.argv[2],blocks:Object.fromEntries(Object.entries(result.routes).map(([n,r])=>[n,r.blockNumber]))}))}).catch(e=>{console.error(e.message);process.exitCode=1})
module.exports={captureRoute,inventoryBridge,LEGACY_ROUTERS,IMPLEMENTATION_SLOT,ADMIN_SLOT,BEACON_SLOT,same}

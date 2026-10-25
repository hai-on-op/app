'use strict'

// Read-only. No signer, wallet key, sendTransaction, or state-changing RPC method.
const fs = require('node:fs')
const {
    SAFE,
    DEAD,
    CHAINS,
    deployments,
    assert,
    economicOutstanding,
    convert,
    rpc,
    read,
    verifyDeployments,
} = require('./lib.cjs')

async function inventory(network) {
    const chain = CHAINS[network]
    const url = chain.rpc()
    // All reads on a chain are pinned to one finalized block, not independent latest reads.
    const block = await rpc(url, 'eth_getBlockByNumber', ['finalized', false])
    assert(block?.hash, 'Finalized block unavailable')
    const tag = block.number
    const contracts = await verifyDeployments(network, tag)
    const call = (address, signature, args) => read(url, tag, address, signature, args)
    const scalar = async (address, signature, args) => (await call(address, signature, args))[0].toString()
    const migration = deployments.contracts[chain.migration].address
    const [owners] = await call(SAFE, 'getOwners() view returns(address[])')
    const result = {
        chainId: chain.id,
        block: Number(tag),
        blockHash: block.hash,
        timestamp: Number(block.timestamp),
        contracts,
        safe: {
            address: SAFE,
            owners,
            threshold: await scalar(SAFE, 'getThreshold() view returns(uint256)'),
            nonce: await scalar(SAFE, 'nonce() view returns(uint256)'),
            nativeBalance: BigInt(await rpc(url, 'eth_getBalance', [SAFE, tag])).toString(),
        },
        legacy: {
            token: chain.legacyToken,
            escrow: chain.legacyEscrow,
            voter: await scalar(chain.legacyEscrow, 'voter() view returns(address)'),
            distributor: await scalar(chain.legacyEscrow, 'distributor() view returns(address)'),
            liquidBalance: await scalar(chain.legacyToken, 'balanceOf(address) view returns(uint256)', [SAFE]),
            nfts: [],
        },
        migration: {
            address: migration,
            paused: (await call(migration, 'paused() view returns(bool)'))[0],
            opensAt: await scalar(migration, 'MIGRATION_OPEN() view returns(uint48)'),
        },
        claims: [],
        requiredLocalNewPrincipal: '0',
    }
    const count = Number(await scalar(chain.legacyEscrow, 'balanceOf(address) view returns(uint256)', [SAFE]))
    for (let index = 0; index < count; index++) {
        const id = await scalar(chain.legacyEscrow, 'ownerToNFTokenIdList(address,uint256) view returns(uint256)', [
            SAFE,
            index,
        ])
        const locked = await call(chain.legacyEscrow, 'locked(uint256) view returns(int128,uint256,bool)', [id])
        const preview = await call(migration, 'previewConversion(uint256) view returns(uint256,uint256,bool,bool)', [
            id,
        ])
        result.legacy.nfts.push({
            id,
            owner: await scalar(chain.legacyEscrow, 'ownerOf(uint256) view returns(address)', [id]),
            principal: locked[0].toString(),
            end: locked[1].toString(),
            permanent: locked[2],
            voted: (await call(chain.legacyEscrow, 'voted(uint256) view returns(bool)', [id]))[0],
            restricted: (await call(migration, 'restricted(uint256) view returns(bool)', [id]))[0],
            outputPrincipal: preview[1].toString(),
            outputLiquid: preview[3],
            productAssignment: null,
        })
    }
    for (const wrapper of chain.wrappers) {
        const totalSupply = await scalar(wrapper.address, 'totalSupply() view returns(uint256)')
        const dead = await scalar(wrapper.address, 'balanceOf(address) view returns(uint256)', [DEAD])
        const custody = wrapper.duplicateCustody
            ? await scalar(wrapper.address, 'balanceOf(address) view returns(uint256)', [wrapper.duplicateCustody])
            : '0'
        const outstanding = economicOutstanding(totalSupply, [dead, custody])
        const output = convert(outstanding, wrapper.numerator, wrapper.denominator, true)
        result.claims.push({
            ...wrapper,
            totalSupply,
            deadBalance: dead,
            duplicateCustodyBalance: custody,
            economicOutstanding: outstanding.toString(),
            requiredNewPrincipal: output.toString(),
        })
        result.requiredLocalNewPrincipal = (BigInt(result.requiredLocalNewPrincipal) + output).toString()
    }
    if (network === 'base') {
        const token = deployments.contracts['aero-token'].address
        const escrow = deployments.contracts.escrow.address
        result.newBacking = {
            token,
            escrow,
            liquidBalance: await scalar(token, 'balanceOf(address) view returns(uint256)', [SAFE]),
            nfts: [],
        }
        const newCount = Number(await scalar(escrow, 'balanceOf(address) view returns(uint256)', [SAFE]))
        for (let index = 0; index < newCount; index++) {
            const id = await scalar(escrow, 'tokenOfOwnerByIndex(address,uint256) view returns(uint256)', [SAFE, index])
            const stake = await call(escrow, 'staked(uint256) view returns(uint128,uint48,bool)', [id])
            result.newBacking.nfts.push({
                id,
                principal: stake[0].toString(),
                end: stake[1].toString(),
                permanent: stake[2],
            })
        }
    }
    const stillCanonical = await rpc(url, 'eth_getBlockByNumber', [tag, false])
    assert(stillCanonical.hash === block.hash, 'Snapshot block changed')
    return result
}

async function main() {
    const output = process.argv[2]
    assert(output, 'Usage: node scripts/aero-migration/inventory.cjs OUTPUT.json')
    const result = {
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        sourceCommit: deployments.sourceCommit,
        chains: {},
    }
    for (const network of Object.keys(CHAINS)) result.chains[network] = await inventory(network)
    const base = result.chains.base
    const op = result.chains.optimism
    const lockedBase = base.legacy.nfts.reduce((sum, nft) => sum + BigInt(nft.outputPrincipal), 0n)
    const lockedOp = op.legacy.nfts.reduce((sum, nft) => sum + BigInt(nft.outputPrincipal), 0n)
    const baseBridge = base.claims[0].duplicateCustodyBalance
    const opBridge = op.claims.find((claim) => claim.name === 'haiAERO OP').totalSupply
    result.reconciliation = {
        allSafeLegacyNftPreviewOutput: (lockedBase + lockedOp).toString(),
        visibleLocalLiabilities: (
            BigInt(base.requiredLocalNewPrincipal) + BigInt(op.requiredLocalNewPrincipal)
        ).toString(),
        bridgeEscrowMinusSyntheticSupply: (BigInt(baseBridge) - BigInt(opBridge)).toString(),
        bridgeMessagesReconciled: false,
        nftProductAssignmentsReviewed: false,
        legacyRewardsReconciled: false,
        readyForExecution: false,
        note: 'Safe inventory is not automatically product backing. Resolve all cross-chain in-flight messages and verify product assignments, all custody locations, and deployed HAI contracts before activation. Legacy reward status is informational; claim or skip behavior is explicit in the Safe preparation selection. The two chain snapshots have independent finalized timestamps.',
    }
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
    console.log(
        JSON.stringify(
            { output, blocks: { base: base.block, optimism: op.block }, reconciliation: result.reconciliation },
            null,
            2
        )
    )
}

if (require.main === module)
    main().catch((error) => {
        console.error(error.message)
        process.exitCode = 1
    })
module.exports = { inventory }

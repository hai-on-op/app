'use strict'

const fs = require('node:fs')
const { utils } = require('ethers')
const { SAFE, ZERO, CHAINS, deployments, assert, rpc, read, verifyDeployments } = require('./lib.cjs')

const migrationEvents = new utils.Interface([
    'event MessageDispatched(uint64 indexed nonce,address indexed recipient)',
    'event VeNFTMigrated(address indexed depositor,address indexed recipient,uint256 indexed oldTokenId,uint256 amount,uint256 output,bool permanent,bool liquid)',
    'event Migrated(uint64 indexed nonce,address indexed recipient,uint256 amount,bool liquid)',
])
const transferEvents = new utils.Interface([
    'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)',
])

function parsedLogs(receipt, address, iface) {
    return receipt.logs
        .filter((log) => log.address.toLowerCase() === address.toLowerCase())
        .flatMap((log) => {
            try {
                return [{ log, event: iface.parseLog(log) }]
            } catch {
                return []
            }
        })
        .sort((a, b) => Number(a.log.logIndex) - Number(b.log.logIndex))
}

function sourcePositions(receipt) {
    assert(Number(receipt.status) === 1, 'Source transaction failed')
    const address = deployments.contracts['velodrome-migration'].address
    const positions = []
    let pending
    for (const { event } of parsedLogs(receipt, address, migrationEvents)) {
        if (event.name === 'MessageDispatched') {
            assert(!pending, 'Unpaired source dispatch; require an NFT-only migration batch')
            pending = event.args
        } else if (event.name === 'VeNFTMigrated') {
            assert(pending, 'NFT conversion lacks cross-chain dispatch')
            assert(event.args.depositor.toLowerCase() === SAFE.toLowerCase(), 'Unexpected migration depositor')
            assert(
                event.args.recipient.toLowerCase() === SAFE.toLowerCase() &&
                    pending.recipient.toLowerCase() === SAFE.toLowerCase(),
                'Unexpected Base recipient'
            )
            assert(!event.args.liquid, 'Expected an sAERO-backed migration')
            positions.push({
                nonce: pending.nonce.toString(),
                oldTokenId: event.args.oldTokenId.toString(),
                output: event.args.output.toString(),
                permanent: event.args.permanent,
            })
            pending = undefined
        }
    }
    assert(!pending && positions.length > 0, 'Incomplete or empty NFT migration receipt')
    assert(new Set(positions.map((position) => position.nonce)).size === positions.length, 'Duplicate source nonce')
    return positions
}

function destinationPositions(receipt, expected) {
    assert(Number(receipt.status) === 1, 'Destination transaction failed')
    const entrypoint = deployments.contracts['velodrome-entrypoint'].address
    const escrow = deployments.contracts.escrow.address
    const transfers = parsedLogs(receipt, escrow, transferEvents)
    const result = []
    let segmentStart = -1
    for (const { log, event } of parsedLogs(receipt, entrypoint, migrationEvents)) {
        if (event.name !== 'Migrated') continue
        const position = expected.find((entry) => entry.nonce === event.args.nonce.toString())
        const segmentEnd = Number(log.logIndex)
        if (position) {
            assert(event.args.recipient.toLowerCase() === SAFE.toLowerCase(), 'Settlement recipient mismatch')
            assert(
                !event.args.liquid && event.args.amount.toString() === position.output,
                'Settlement amount/type mismatch'
            )
            const segment = transfers.filter(
                (item) => Number(item.log.logIndex) > segmentStart && Number(item.log.logIndex) < segmentEnd
            )
            const received = segment.filter(
                ({ event: transfer }) =>
                    transfer.args.from.toLowerCase() === entrypoint.toLowerCase() &&
                    transfer.args.to.toLowerCase() === SAFE.toLowerCase()
            )
            assert(received.length === 1, 'Settlement lacks one identifiable sAERO transfer')
            const tokenId = received[0].event.args.tokenId.toString()
            assert(
                segment.some(
                    ({ event: transfer }) =>
                        transfer.args.from === ZERO &&
                        transfer.args.to.toLowerCase() === entrypoint.toLowerCase() &&
                        transfer.args.tokenId.toString() === tokenId
                ),
                'Received sAERO was not minted by this settlement'
            )
            result.push({
                ...position,
                newTokenId: tokenId,
                destinationTransaction: receipt.transactionHash,
                destinationBlock: Number(receipt.blockNumber),
            })
        }
        segmentStart = segmentEnd
    }
    return result
}

async function finalizedReceipt(network, hash) {
    assert(/^0x[0-9a-f]{64}$/i.test(hash), 'Invalid transaction hash')
    const url = CHAINS[network].rpc()
    const [receipt, finalized] = await Promise.all([
        rpc(url, 'eth_getTransactionReceipt', [hash]),
        rpc(url, 'eth_getBlockByNumber', ['finalized', false]),
    ])
    assert(receipt && Number(receipt.status) === 1, `${network} transaction missing or failed`)
    assert(Number(receipt.blockNumber) <= Number(finalized.number), `${network} receipt is not finalized`)
    const block = await rpc(url, 'eth_getBlockByNumber', [receipt.blockNumber, false])
    assert(block.hash === receipt.blockHash, `${network} receipt is not canonical`)
    await verifyDeployments(network, finalized.number)
    return receipt
}

async function verify(sourceHash, destinationHashes) {
    assert(
        destinationHashes.length > 0 && new Set(destinationHashes).size === destinationHashes.length,
        'Distinct destination transaction hashes required'
    )
    const source = await finalizedReceipt('optimism', sourceHash)
    const expected = sourcePositions(source)
    const settled = []
    for (const hash of destinationHashes) {
        const receipt = await finalizedReceipt('base', hash)
        settled.push(...destinationPositions(receipt, expected))
    }
    assert(
        settled.length === expected.length && new Set(settled.map((entry) => entry.nonce)).size === expected.length,
        'Missing or duplicated cross-chain settlements'
    )
    const destinationBlock = await rpc(CHAINS.base.rpc(), 'eth_getBlockByNumber', ['finalized', false])
    const tag = destinationBlock.number
    for (const position of settled) {
        const escrow = deployments.contracts.escrow.address
        const [owner] = await read(CHAINS.base.rpc(), tag, escrow, 'ownerOf(uint256) view returns(address)', [
            position.newTokenId,
        ])
        const stake = await read(CHAINS.base.rpc(), tag, escrow, 'staked(uint256) view returns(uint128,uint48,bool)', [
            position.newTokenId,
        ])
        const [used] = await read(
            CHAINS.base.rpc(),
            tag,
            deployments.contracts['velodrome-entrypoint'].address,
            'noncesUsed(uint64) view returns(bool)',
            [position.nonce]
        )
        assert(used && owner.toLowerCase() === SAFE.toLowerCase(), 'Settlement is not currently held by the treasury')
        assert(
            stake[0].toString() === position.output && stake[2] === position.permanent,
            'Settled principal/lock differs from source conversion'
        )
        position.currentOwner = owner
        position.currentPrincipal = stake[0].toString()
        position.currentPermanent = stake[2]
    }
    const canonical = await rpc(CHAINS.base.rpc(), 'eth_getBlockByNumber', [tag, false])
    assert(canonical?.hash === destinationBlock.hash, 'Destination ownership snapshot was reorganized')
    return {
        schemaVersion: 1,
        sourceCommit: deployments.sourceCommit,
        sourceTransaction: sourceHash,
        verifiedAt: new Date().toISOString(),
        destinationReadBlock: Number(tag),
        destinationReadBlockHash: destinationBlock.hash,
        settled,
    }
}

async function main() {
    const [sourceHash, destinationListPath, outputPath] = process.argv.slice(2)
    assert(
        sourceHash && destinationListPath && outputPath,
        'Usage: node scripts/aero-migration/verify-settlement.cjs OP_TX DESTINATION_TX_HASHES.json OUTPUT.json'
    )
    const result = await verify(sourceHash, JSON.parse(fs.readFileSync(destinationListPath)))
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
    console.log(JSON.stringify({ outputPath, verifiedPositions: result.settled.length }))
}
if (require.main === module)
    main().catch((error) => {
        console.error(error.message)
        process.exitCode = 1
    })
module.exports = { sourcePositions, destinationPositions, verify }

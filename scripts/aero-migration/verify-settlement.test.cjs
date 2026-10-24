'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { utils } = require('ethers')
const { SAFE, ZERO, deployments } = require('./lib.cjs')
const { sourcePositions, destinationPositions } = require('./verify-settlement.cjs')
const iface = new utils.Interface([
    'event MessageDispatched(uint64 indexed nonce,address indexed recipient)',
    'event VeNFTMigrated(address indexed depositor,address indexed recipient,uint256 indexed oldTokenId,uint256 amount,uint256 output,bool permanent,bool liquid)',
    'event Migrated(uint64 indexed nonce,address indexed recipient,uint256 amount,bool liquid)',
    'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)',
])
const migration = deployments.contracts['velodrome-migration'].address
const entrypoint = deployments.contracts['velodrome-entrypoint'].address
const escrow = deployments.contracts.escrow.address
function log(address, name, args, index) {
    return { address, ...iface.encodeEventLog(iface.getEvent(name), args), logIndex: index }
}
const source = {
    status: '0x1',
    logs: [
        log(migration, 'MessageDispatched', [5, SAFE], 1),
        log(migration, 'VeNFTMigrated', [SAFE, SAFE, 99, 1000, 44, true, false], 2),
    ],
}
const destination = {
    status: '0x1',
    transactionHash: '0xabc',
    blockNumber: '0x100',
    logs: [
        log(escrow, 'Transfer', [ZERO, entrypoint, 50], 1),
        log(escrow, 'Transfer', [entrypoint, SAFE, 50], 2),
        log(entrypoint, 'Migrated', [5, SAFE, 44, false], 3),
    ],
}
test('links source NFT to destination NFT by authenticated nonce and exact principal', () => {
    const positions = sourcePositions(source)
    assert.deepEqual(positions, [{ nonce: '5', oldTokenId: '99', output: '44', permanent: true }])
    assert.equal(destinationPositions(destination, positions)[0].newTokenId, '50')
})
test('rejects failed, unpaired, foreign or liquid source conversions', () => {
    assert.throws(() => sourcePositions({ ...source, status: '0x0' }))
    assert.throws(() => sourcePositions({ ...source, logs: [source.logs[1]] }))
    assert.throws(() => sourcePositions({ ...source, logs: source.logs.map((entry) => ({ ...entry, address: ZERO })) }))
    assert.throws(() =>
        sourcePositions({
            ...source,
            logs: [source.logs[0], log(migration, 'VeNFTMigrated', [SAFE, SAFE, 99, 1000, 44, true, true], 2)],
        })
    )
})
test('a generic balance increase, wrong amount or another nonce cannot prove settlement', () => {
    const expected = sourcePositions(source)
    assert.throws(() => destinationPositions({ ...destination, logs: [destination.logs[2]] }, expected))
    assert.throws(() =>
        destinationPositions(
            {
                ...destination,
                logs: [...destination.logs.slice(0, 2), log(entrypoint, 'Migrated', [5, SAFE, 43, false], 3)],
            },
            expected
        )
    )
    assert.deepEqual(
        destinationPositions(
            {
                ...destination,
                logs: [...destination.logs.slice(0, 2), log(entrypoint, 'Migrated', [6, SAFE, 44, false], 3)],
            },
            expected
        ),
        []
    )
})

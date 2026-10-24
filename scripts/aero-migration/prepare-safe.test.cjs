'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { SAFE, deployments } = require('./lib.cjs')
const { validateSelection } = require('./prepare-safe.cjs')
const snapshot = {
    sourceCommit: deployments.sourceCommit,
    chains: {
        base: {
            chainId: 8453,
            timestamp: 1000,
            blockHash: '0x1234',
            legacy: { nfts: [{ id: '1', owner: SAFE, principal: '100', restricted: false, outputLiquid: false }] },
        },
    },
}
const selection = {
    schemaVersion: 1,
    network: 'base',
    recipient: SAFE,
    snapshotBlockHash: '0x1234',
    positions: [
        {
            id: '1',
            product: 'haiAERO',
            expectedPrincipal: '100',
            historicalRewardsReviewed: true,
            rewardReviewReference: 'review-2026-10-24',
            fees: [],
            incentives: [],
        },
    ],
}
test('requires product selection, exact snapshot/principal and prior reward review before irreversible preparation', () => {
    assert.equal(validateSelection(snapshot, selection, 1000).chainId, 8453)
    assert.throws(() => validateSelection(snapshot, { ...selection, positions: [] }, 1000))
    assert.throws(() => validateSelection(snapshot, { ...selection, snapshotBlockHash: '0xBAD' }, 1000))
    for (const patch of [
        { historicalRewardsReviewed: false },
        { product: 'treasury' },
        { expectedPrincipal: '99' },
        { id: '2' },
    ]) {
        assert.throws(() =>
            validateSelection(snapshot, { ...selection, positions: [{ ...selection.positions[0], ...patch }] }, 1000)
        )
    }
})
test('rejects duplicate NFTs, unexpected Base recipient, stale/future snapshot', () => {
    assert.throws(() =>
        validateSelection(snapshot, { ...selection, positions: [...selection.positions, ...selection.positions] }, 1000)
    )
    assert.throws(() =>
        validateSelection(snapshot, { ...selection, recipient: '0x0000000000000000000000000000000000000001' }, 1000)
    )
    assert.throws(() => validateSelection(snapshot, selection, 9000))
    assert.throws(() => validateSelection(snapshot, selection, 999))
})

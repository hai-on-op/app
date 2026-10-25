'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { BigNumber, utils } = require('ethers')
const { SAFE, CHAINS, deployments } = require('./lib.cjs')
const { validateSelection, prepare } = require('./prepare-safe.cjs')
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

function preparationFixture(network = 'base', overrides = {}) {
    const voter = '0x0000000000000000000000000000000000000011'
    const distributor = '0x0000000000000000000000000000000000000022'
    const now = Math.floor(Date.now() / 1000)
    const chain = {
        ...snapshot.chains.base,
        chainId: CHAINS[network].id,
        timestamp: now,
        legacy: { ...snapshot.chains.base.legacy, voter, distributor },
    }
    const plan = {
        ...selection,
        network,
        rewardPolicy: 'skip',
        maxMessageFeePerNft: '10',
        positions: [{ id: '1', product: network === 'base' ? 'haiAERO' : 'haiVELO', expectedPrincipal: '100' }],
    }
    const calls = []
    const clients = {
        async rpc(_url, method) {
            if (method === 'eth_getBlockByNumber') return { number: '0x123', hash: '0x1234', timestamp: now }
            if (method === 'eth_getBalance') return overrides.balance ?? '0xa'
            throw new Error(`Unexpected RPC: ${method}`)
        },
        async verifyDeployments(chainName, block) {
            assert.equal(chainName, network)
            assert.equal(block, '0x123')
            calls.push('verifyDeployments')
        },
        async read(_url, _tag, address, signature) {
            const method = signature.split('(')[0]
            calls.push(method)
            const answers = {
                paused: [false],
                MIGRATION_OPEN: [BigNumber.from(0)],
                voter: [voter],
                distributor: [distributor],
                ownerOf: [overrides.owner ?? SAFE],
                restricted: [overrides.restricted ?? false],
                previewConversion: [BigNumber.from(overrides.principal ?? 100), BigNumber.from(100), true, false],
                voted: [overrides.voted ?? false],
                quoteDepositVeNFT: [BigNumber.from(overrides.fee ?? 5)],
                nonce: [BigNumber.from(1)],
            }
            if (method === 'claimable') {
                assert.equal(address, distributor)
                if (!overrides.allowRewards) throw new Error('Reward RPC deliberately unavailable')
                return [BigNumber.from(overrides.rebase ?? 7)]
            }
            if (!Object.hasOwn(answers, method)) throw new Error(`Unexpected read: ${signature}`)
            return answers[method]
        },
    }
    return { snapshot: { sourceCommit: deployments.sourceCommit, chains: { [network]: chain } }, plan, clients, calls }
}

test('explicit skip policy accepts unreviewed rewards but rejects unknown policies', () => {
    const { snapshot: current, plan } = preparationFixture()
    assert.equal(validateSelection(current, plan).chainId, 8453)
    assert.throws(() => validateSelection(current, { ...plan, rewardPolicy: 'skip-everything' }), /reward policy/)
    assert.throws(() => validateSelection(current, { ...plan, rewardPolicy: undefined }), /review reference/)
})

test('skip prepares both chains without reward calls and reports outstanding rewards as unchecked', async () => {
    for (const network of ['base', 'optimism']) {
        const f = preparationFixture(network)
        const report = await prepare(f.snapshot, f.plan, f.clients)
        assert.equal(report.rewardPolicy, 'skip')
        assert.equal(report.rewardClaimsChecked, false)
        assert.equal(report.rewardClaimsOutstanding, null)
        assert.equal(report.readyForUpgradeSimulation, true)
        assert.equal(report.claimsAndReset, null)
        assert.equal(report.upgrade.transactions.length, 2)
        assert.ok(f.calls.includes('verifyDeployments'))
        assert.ok(!f.calls.some((call) => ['distributor', 'earned', 'claimable'].includes(call)))
    }
})

test('skip still requires upstream vote reset and emits no reward claims in its reset batch', async () => {
    const f = preparationFixture('base', { voted: true })
    const report = await prepare(f.snapshot, f.plan, f.clients)
    assert.equal(report.upgrade, null)
    assert.equal(report.readyForUpgradeSimulation, false)
    assert.equal(report.claimsAndReset.transactions.length, 1)
    assert.equal(report.claimsAndReset.transactions[0].data, new utils.Interface(['function reset(uint256)']).encodeFunctionData('reset', [1]))
})

test('skip cannot bypass live ownership, principal, restrictions or message fee limits', async () => {
    for (const overrides of [
        { owner: '0x0000000000000000000000000000000000000001' },
        { principal: 99 },
        { restricted: true },
        { fee: 11 },
    ]) {
        const f = preparationFixture('optimism', overrides)
        await assert.rejects(prepare(f.snapshot, f.plan, f.clients))
    }
    const f = preparationFixture('optimism', { balance: '0x0' })
    const report = await prepare(f.snapshot, f.plan, f.clients)
    assert.equal(report.totalMessageFeeWei, '5')
    assert.equal(report.upgrade, null)
    assert.equal(report.readyForUpgradeSimulation, false)
})

test('claim-reviewed remains the default and outstanding rebases still require its claim phase', async () => {
    const f = preparationFixture('base', { allowRewards: true })
    f.plan.positions = selection.positions
    delete f.plan.rewardPolicy
    const report = await prepare(f.snapshot, f.plan, f.clients)
    assert.equal(report.rewardPolicy, 'claim-reviewed')
    assert.equal(report.rewardClaimsChecked, true)
    assert.equal(report.rewardClaimsOutstanding, true)
    assert.equal(report.upgrade, null)
    assert.equal(report.claimsAndReset.transactions.length, 1)
    assert.equal(report.claimsAndReset.transactions[0].data, new utils.Interface(['function claim(uint256)']).encodeFunctionData('claim', [1]))
})

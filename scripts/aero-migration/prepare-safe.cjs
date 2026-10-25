'use strict'

// Produces unsigned Safe Transaction Builder files. This script cannot execute transactions.
const fs = require('node:fs')
const { utils } = require('ethers')
const {
    SAFE,
    CHAINS,
    deployments,
    assert,
    integer,
    encode,
    rpc,
    read,
    verifyDeployments,
    safeBatch,
} = require('./lib.cjs')

function rewardPolicy(selection) {
    const policy = selection.rewardPolicy ?? 'claim-reviewed'
    assert(['claim-reviewed', 'skip'].includes(policy), 'Unsupported reward policy')
    return policy
}

function validateSelection(snapshot, selection, now = Math.floor(Date.now() / 1000)) {
    assert(selection.schemaVersion === 1 && CHAINS[selection.network], 'Invalid selection schema/chain')
    const policy = rewardPolicy(selection)
    assert(
        selection.recipient?.toLowerCase() === SAFE.toLowerCase(),
        'Backing must settle to the existing Base treasury Safe'
    )
    assert(snapshot.sourceCommit === deployments.sourceCommit, 'Snapshot deployment version mismatch')
    const chain = snapshot.chains[selection.network]
    assert(chain && chain.chainId === CHAINS[selection.network].id, 'Snapshot chain mismatch')
    assert(chain.timestamp <= now && now - chain.timestamp <= 7200, 'Snapshot is stale or from the future')
    assert(selection.snapshotBlockHash === chain.blockHash, 'Selection is not bound to this snapshot')
    assert(
        Array.isArray(selection.positions) && selection.positions.length > 0,
        'Explicit product NFT selection required'
    )
    const seen = new Set()
    for (const position of selection.positions) {
        integer(position.id, 'NFT ID')
        assert(!seen.has(position.id), 'Duplicate selected NFT')
        seen.add(position.id)
        assert(['haiVELO', 'haiAERO'].includes(position.product), 'Product allocation must be explicitly reviewed')
        assert(position.product === (selection.network === 'base' ? 'haiAERO' : 'haiVELO'), 'Product/chain mismatch')
        const observed = chain.legacy.nfts.find((nft) => nft.id === position.id)
        assert(observed && observed.owner.toLowerCase() === SAFE.toLowerCase(), 'NFT not owned by treasury in snapshot')
        assert(!observed.restricted && !observed.outputLiquid, 'Unsupported NFT migration outcome')
        assert(position.expectedPrincipal === observed.principal, 'Reviewed principal changed')
        if (policy === 'skip') continue
        assert(
            typeof position.rewardReviewReference === 'string' && position.rewardReviewReference.trim().length >= 8,
            'Historical fee/incentive review reference required'
        )
        assert(position.historicalRewardsReviewed === true, 'Review all historical reward venues before retiring NFTs')
        assert(
            Array.isArray(position.fees) && Array.isArray(position.incentives),
            'Explicit fee/incentive claim lists required'
        )
        for (const group of [...position.fees, ...position.incentives]) {
            assert(utils.isAddress(group.contract), 'Invalid reward contract')
            assert(
                Array.isArray(group.tokens) && group.tokens.length > 0 && group.tokens.every(utils.isAddress),
                'Invalid reward token list'
            )
        }
    }
    return chain
}

async function prepare(snapshot, selection, clients = { rpc, read, verifyDeployments }) {
    const chain = validateSelection(snapshot, selection)
    const policy = rewardPolicy(selection)
    const network = CHAINS[selection.network]
    const url = network.rpc()
    const block = await clients.rpc(url, 'eth_getBlockByNumber', ['latest', false])
    const tag = block.number
    await clients.verifyDeployments(selection.network, tag)
    const call = (address, signature, args) => clients.read(url, tag, address, signature, args)
    const migration = deployments.contracts[network.migration].address
    assert(!(await call(migration, 'paused() view returns(bool)'))[0], 'Official migration paused')
    assert(
        BigInt(block.timestamp) >=
            BigInt((await call(migration, 'MIGRATION_OPEN() view returns(uint48)'))[0].toString()),
        'Official migration not open'
    )
    const voter = (await call(network.legacyEscrow, 'voter() view returns(address)'))[0]
    assert(voter.toLowerCase() === chain.legacy.voter.toLowerCase(), 'Legacy voter changed')
    let distributor
    if (policy === 'claim-reviewed') {
        distributor = (await call(network.legacyEscrow, 'distributor() view returns(address)'))[0]
        assert(distributor.toLowerCase() === chain.legacy.distributor.toLowerCase(), 'Legacy distributor changed')
    }
    const claims = []
    const upgrades = []
    let totalFee = 0n
    let rewardClaimsOutstanding = policy === 'skip' ? null : false
    let votesOutstanding = false
    for (const position of selection.positions) {
        const owner = (await call(network.legacyEscrow, 'ownerOf(uint256) view returns(address)', [position.id]))[0]
        assert(owner.toLowerCase() === SAFE.toLowerCase(), 'NFT owner changed')
        assert(!(await call(migration, 'restricted(uint256) view returns(bool)', [position.id]))[0], 'NFT restricted')
        const preview = await call(migration, 'previewConversion(uint256) view returns(uint256,uint256,bool,bool)', [
            position.id,
        ])
        assert(
            preview[0].toString() === position.expectedPrincipal && !preview[3],
            'Refresh reviewed principal or migration outcome'
        )
        for (const [kind, groups] of policy === 'skip'
            ? []
            : [
                  ['claimFees', position.fees],
                  ['claimBribes', position.incentives],
              ]) {
            if (groups.length === 0) continue
            for (const group of groups) {
                const rewardVoter = (await call(group.contract, 'voter() view returns(address)'))[0]
                assert(rewardVoter.toLowerCase() === voter.toLowerCase(), 'Reward contract belongs to another voter')
                for (const token of group.tokens) {
                    const amount = (
                        await call(group.contract, 'earned(address,uint256) view returns(uint256)', [
                            token,
                            position.id,
                        ])
                    )[0]
                    if (!amount.isZero()) rewardClaimsOutstanding = true
                }
            }
            claims.push({
                to: voter,
                value: '0',
                data: encode(`${kind}(address[],address[][],uint256)`, [
                    groups.map((g) => g.contract),
                    groups.map((g) => g.tokens),
                    position.id,
                ]),
            })
        }
        if (policy === 'claim-reviewed') {
            const rebase = (await call(distributor, 'claimable(uint256) view returns(uint256)', [position.id]))[0]
            if (!rebase.isZero()) {
                rewardClaimsOutstanding = true
                claims.push({ to: distributor, value: '0', data: encode('claim(uint256)', [position.id]) })
            }
        }
        if ((await call(network.legacyEscrow, 'voted(uint256) view returns(bool)', [position.id]))[0]) {
            votesOutstanding = true
            claims.push({ to: voter, value: '0', data: encode('reset(uint256)', [position.id]) })
        }
        let fee = 0n
        if (selection.network === 'optimism') {
            fee = BigInt(
                (
                    await call(migration, 'quoteDepositVeNFT(uint256,address) view returns(uint256)', [
                        position.id,
                        SAFE,
                    ])
                )[0].toString()
            )
            assert(
                fee <= integer(selection.maxMessageFeePerNft, 'max message fee'),
                'Message fee exceeds reviewed maximum'
            )
        }
        totalFee += fee
        upgrades.push({
            to: network.legacyEscrow,
            value: '0',
            data: encode('approve(address,uint256)', [migration, position.id]),
        })
        upgrades.push({
            to: migration,
            value: fee.toString(),
            data: encode('depositVeNFT(uint256,address)', [position.id, SAFE]),
        })
    }
    // Separating stages avoids invalidating output previews when claiming rebases adds principal.
    const nativeBalance = BigInt(await clients.rpc(url, 'eth_getBalance', [SAFE, tag]))
    const canPrepareUpgrade =
        (policy === 'skip' || rewardClaimsOutstanding === false) && !votesOutstanding && nativeBalance >= totalFee
    return {
        schemaVersion: 1,
        network: selection.network,
        checkedBlock: Number(tag),
        checkedBlockHash: block.hash,
        safeNonce: (await call(SAFE, 'nonce() view returns(uint256)'))[0].toString(),
        totalMessageFeeWei: totalFee.toString(),
        safeNativeBalanceWei: nativeBalance.toString(),
        rewardPolicy: policy,
        rewardClaimsChecked: policy === 'claim-reviewed',
        rewardClaimsOutstanding,
        votesOutstanding,
        claimsAndReset: claims.length
            ? safeBatch(
                  network.id,
                  claims,
                  policy === 'skip'
                      ? 'Clear votes required for migration. Reward claims are skipped. Refresh inventory after execution.'
                      : 'Claim reviewed legacy rewards and clear votes. Refresh inventory and reviewed principal after execution.'
              )
            : null,
        upgrade: canPrepareUpgrade
            ? safeBatch(
                  network.id,
                  upgrades,
                  'Irreversible Aero backing conversion. Receive new sAERO in the Base treasury Safe; reconcile settlement before wrapping or issuing user tokens.'
              )
            : null,
        readyForUpgradeSimulation: canPrepareUpgrade,
        requiresSafeSignatures: true,
        note:
            'Unsigned preparation only. A successful fork simulation and current fee/nonce checks are required before Safe signatures. ' +
            (policy === 'skip'
                ? 'Reward review and claims are skipped by selection policy; unclaimed rewards and rebases are not reported as zero or reconciled. Current principal, ownership and settlement checks still apply.'
                : 'Historical reward completeness and NFT product ownership require the recorded operator review; current claim lists alone cannot prove completeness.'),
    }
}

async function main() {
    const [snapshotPath, selectionPath, outputPath] = process.argv.slice(2)
    assert(
        snapshotPath && selectionPath && outputPath,
        'Usage: node scripts/aero-migration/prepare-safe.cjs INVENTORY.json REVIEWED-SELECTION.json OUTPUT.json'
    )
    const result = await prepare(JSON.parse(fs.readFileSync(snapshotPath)), JSON.parse(fs.readFileSync(selectionPath)))
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
    console.log(
        JSON.stringify({
            outputPath,
            readyForUpgradeSimulation: result.readyForUpgradeSimulation,
            totalMessageFeeWei: result.totalMessageFeeWei,
        })
    )
}
if (require.main === module)
    main().catch((error) => {
        console.error(error.message)
        process.exitCode = 1
    })
module.exports = { validateSelection, prepare }

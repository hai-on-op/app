# Aero migration release

The replacement haiAERO uses the existing custody model: the Base treasury Safe owns the backing sAERO NFTs and controls voting, reward claims, and subsequent backing migrations. Deposits issue one haiAERO per unit of permanent sAERO principal delivered to that Safe. NFT voting power is not the issuance unit. Treasury-owned migration NFTs may be registered once by the Safe without transferring custody away from it.

This release introduces distinct new HAI contracts and a distinct Base–Optimism route. Legacy token addresses and vault collateral types retain their existing meanings. The app's production adoption registries remain empty until the deployment and activation evidence below exists.

## Execution ownership

The user will execute all deployments and transactions when ready. Current work is source code, read-only verification, local fork simulation, and unsigned preparation. The app feature branch disables automatic Vercel deployment. The [confirmed decisions](aero-migration-evidence/2026-10-24-decisions.json) retain the existing treasury Safe as NFT custodian, reuse the deployed Pyth AERO/USD oracle, and assign all 19 Optimism veVELO and four Base veAERO NFTs to product backing.

Draft source reviews: [app #249](https://github.com/hai-on-op/app/pull/249), [core #160](https://github.com/hai-on-op/core/pull/160), [SDK #103](https://github.com/hai-on-op/sdk/pull/103), and [rewards #11](https://github.com/hai-on-op/daily-rewards/pull/11). These are not deployment evidence.

## Verified upstream deployment

The official [deployment address repository](https://github.com/dromos-labs/metadex-public/tree/8b506b450aaa9d4a9f1a77e264f2d9dd508e9ddf/deployment-addresses) is pinned at commit `8b506b450aaa9d4a9f1a77e264f2d9dd508e9ddf`. `scripts/aero-migration/aero-deployments.json` contains the checked runtime and source hashes. Inventory and preparation commands recheck the runtime against the actual chain.

| Asset / contract | Chain | Address |
| --- | --- | --- |
| New AERO | Base | `0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee` |
| sAERO | Base | `0xBF7977E1521e9a3032bf7243Ee4712f311f13915` |
| Legacy AERO NFT migration | Base | `0x22a2F7340a3fB4C7C389D91eE954766B12476721` |
| Legacy VELO NFT migration | Optimism | `0x6daE95FE833f190640dB1176F8C8a2e50C6a66c0` |
| VELO migration receiver | Base | `0x6daE95FE833f190640dB1176F8C8a2e50C6a66c0` |
| HAI treasury Safe | Both | `0x7F4735237c41F7F8578A9C7d10A11e3BCFa3D4A3` |

The equal migration addresses on the two chains contain different code. No upstream address in this table is a new HAI wrapper, migrator, or bridge deployment.

The [October 24 finalized inventory](aero-migration-evidence/2026-10-24-finalized-inventory.json) is a dated review artifact. Its unresolved reconciliation fields are deliberately false; it is not execution authorization or a fresh quote.

The migration decision is to reuse the existing Pyth AERO/USD price. On October 24, the linked [Pyth page](https://app.pyth.com/explore/Crypto.AERO%2FUSD) displayed feed ID `179` and the instrument name `AERODROME FINANCE / US DOLLAR`. That UI identifier is not automatically the on-chain feed identifier. Onboarding must bind the existing deployed feed and preserve its current price-validity protections; it does not require a new feed or a separate publisher-transition approval.

The [verified existing oracle wiring](aero-existing-pyth-oracle.md) selects OP delayed oracle `0x7DA9D12c5b6Fd2548B0E535Ec12F2406D69aBb75`, ultimately backed by Pyth feed `0x9db37f4d5654aad3e37e2e14ffd8d53265fb3026d1d8f91146539eebaa2ef45f`. The same oracle can serve the distinct new collateral without redeployment. Its one-hour update delay, relayer freshness checks, sequencer check and existing update keeper remain relevant.

## Release sequence

1. **Refresh and reconcile backing.** Run the inventory tool against finalized blocks. Use the confirmed product assignment for the 23 inventoried NFTs, review all historical fee/incentive venues, and reconcile legacy bridge messages still in flight. Newly discovered treasury positions require an explicit assignment before inclusion. Exclude burned v1 supply and count Base bridge escrow and its OP synthetic only once.
2. **Finalize legacy rewards.** Prepare, simulate, sign, and execute the separate reward-claim/reset batch. Refresh the inventory afterward: claiming rebases changes principal. Preserve cumulative entitlements through the last published Merkle root and account for later receipts against the period that earned them. The rewards repository's exact revenue ledger and exporter document this boundary.
3. **Migrate treasury backing.** Prepare and simulate official migration calls with current previews and quoted message fees. The existing Safe requires two signatures. It must hold enough native ETH for payable messages. For OP-origin NFTs, verify the message-specific Base settlement before considering their principal available. Keep all resulting NFTs in the Base Safe. Finite stakes must be deliberately converted to permanent stakes before wrapper intake; the issuer rejects timed stakes.
4. **Deploy HAI contracts and the new bridge.** Deploy the paused Base issuer with the existing Safe as immutable treasury, then a new Hyperlane collateral router on Base and synthetic router on OP. Review remote routers, domains, ISM, proxy implementations, owners and gas hooks. Do not reuse the legacy route or an old YAML file whose underlying is legacy AERO. Use the [unsigned Hyperlane preparation](aero-hyperlane-preparation.md), which pins the CLI and records the existing bridge administration separately from NFT custody. Record deployment receipts, canonical blocks, verified source commits and runtime hashes.
5. **Issue and allocate conversion inventory.** The Safe registers its verified permanent sAERO NFTs once, receives new haiAERO, and bridges the OP allocation through the new route. Confirm message-specific destination delivery. Deploy and fund per-chain migrators. Their live readiness checks must cover every outstanding local legacy claim and each route cap. Keep a reserve/rebalancing procedure for legacy deposits and bridge movements after the census.
6. **Install the distinct OP collateral.** Prepare the new collateral ID, join, oracle, liquidation configuration, and auction support through HAI's governance process. Reuse the existing Pyth AERO/USD price as decided, verifying the exact deployed feed and preserving its current validity protections. A zero debt ceiling can be used for staged installation; borrowing requires the approved ceiling and functioning liquidation liquidity/keepers. Preserve old vault repayment, collateral top-up, and withdrawal paths.
7. **Adopt verified deployments in the app.** Populate the issuer, migration and bridge registries from confirmed deployment evidence, not predicted addresses. Complete the collateral/SDK registration and rewards configuration. Build and test the exact resulting commit. Run small real mint, bridge, wallet conversion and vault transactions before increasing exposure; verify receipt events and balances on both chains.
8. **Operate the transition.** Monitor Safe-held principal, issuer supply, new bridge escrow/synthetic supply, outstanding old claims, migrator reserves, late legacy deposits, pending messages, reward funding, oracle freshness and liquidation capacity. Pause migration when its accounting cannot be reconciled. UI gating cannot pause the immutable legacy minting contracts.

## Read-only inventory and unsigned Safe preparation

Use Node 24 and the app's installed dependencies. `BASE_RPC_URL` and `OP_RPC_URL` can select archive-capable providers. The defaults are official public RPC endpoints. Never put private keys in these files or commands; these tools have no signing path.

Each output path must be new. The commands refuse to overwrite an existing evidence file; use a new dated filename when refreshing an inventory or preparation.

```sh
node scripts/aero-migration/inventory.cjs /tmp/aero-inventory.json
node scripts/aero-migration/prepare-safe.cjs /tmp/aero-inventory.json /tmp/aero-selection.json /tmp/aero-safe-batches.json
node scripts/aero-migration/verify-settlement.cjs OP_SOURCE_TX /tmp/base-destination-transactions.json /tmp/aero-settlement.json
node --test scripts/aero-migration/*.test.cjs
```

Selection input has `schemaVersion: 1`, `network: "base"` or `"optimism"`, `recipient` equal to the treasury Safe, the snapshot's `snapshotBlockHash`, and an explicit `positions` array. Each position supplies its decimal-string `id`, `product` (`haiAERO` on Base or `haiVELO` on OP), exact `expectedPrincipal`, `historicalRewardsReviewed: true`, a meaningful `rewardReviewReference`, and `fees`/`incentives` arrays of `{ "contract": "0x…", "tokens": ["0x…"] }`. OP also requires decimal-string `maxMessageFeePerNft`. These are review results, not flags to set without evidence. The snapshot expires after two hours.

The preparation output contains separate `claimsAndReset` and `upgrade` Safe Transaction Builder objects. `upgrade` is absent until the listed rewards and rebases are zero, votes are cleared, and the Safe has the quoted native balance. Import only the relevant nested batch after fork simulation and a final current-state check. The preparation file itself is a report, not a single executable batch. The settlement command's destination input is an array of actual Base transaction hashes; it checks matching nonces, recipients, amounts, minted NFT IDs, current Safe ownership, canonical receipts and replay markers.

The [partial historical rewards review](aero-migration-evidence/2026-10-24-historical-rewards.md) found three nonzero historical rewards for OP NFT 407 and includes a separately simulated unsigned claim batch. Current-pool zero balances did not establish full settlement. Base historical venues, OP remote reward venues, rebase settlement and subsequent accrual remain explicit prerequisites; do not mark historical rewards reconciled from the partial report.

## Unsigned contract deployment and backing intake

The core repository's [migration runbook](https://github.com/hai-on-op/core/blob/feat/saero-migration/docs/aero-migration.md) provides the contract deployment manifest and generators. `script/aero/prepare-deployment.mjs` checks the reviewed compiler artifact and source hashes, canonical upstream bindings and confirmed Safe/deployer roles before emitting unsigned creation data. The user supplies current transaction fees and nonce at execution. The generator does not sign or broadcast.

After real deployment and migration receipts exist, `script/aero/prepare-intake.mjs` verifies the selected new NFT IDs, migration events, current Safe ownership, exact principal and unused issuer records. Its unsigned Safe batch converts finite stakes to permanent mode and registers the principal while retaining Safe custody. If the issuer starts paused, the complete batch temporarily unpauses it and restores the paused state atomically. Do not split or reorder that batch. Both migrator deployment and intake require actual deployed addresses and receipts; the examples intentionally leave those fields unset.

The Hyperlane generator needs the actual Base wrapper receipt and simulated destination gas budgets. SDK release and app adoption follow confirmed deployments; the app remains on the currently published SDK until the compatible version is released. New collateral identity, debt limits and liquidation parameters remain release inputs rather than inferred defaults.

## Borrowers and remaining deployment dependencies

Wallet-held legacy tokens exchange at `1 legacy haiAERO = 1 new haiAERO` and `1 haiVELO = 0.044 new haiAERO`, using integer rounding. Tokens inside a vault or LP position must first be withdrawn through the owning position's normal rules. Migration inventory supplies replacement collateral; it does not repay HAI debt. This release does not promise a flash-funded or zero-upfront-capital vault migration. Existing vaults remain manageable while a borrower repays and moves collateral to the new collateral type.

Shipping source code or publishing the guarded UI does not activate migration. Activation still needs confirmed HAI deployments, reviewed treasury allocation/reward settlement, Safe signatures and message fees, funded migrators, the new bridge, and approved collateral/oracle configuration. Preserve the evidence for each step alongside the release record.

# Legacy NFT rewards: partial historical review

No claim was signed, submitted or executed. The user will execute transactions later. **Historical rewards are not reconciled**, and this evidence does not authorize burning, merging or migrating the old NFTs.

[Evidence](./2026-10-24-historical-rewards.json) records finalized read snapshots for all 19 Optimism veVELO and four Base veAERO NFTs, source URLs, raw reward amounts, venue bindings, coverage limits and the 62 remote pool routes needing further discovery. All 23 NFTs were owned by the Treasury Safe at those snapshots.

Optimism's deployed Voter returned 1,776 `Voted` events from its creation block 105896851 through finalized block 158634527 for the 19 NFT IDs, covering 285 distinct pools. The scan did not filter the caller address, so votes by keepers or delegates were included. This is one public RPC's full-range response; it has not been independently cross-checked with another provider. All 570 fee/bribe venue bindings matched the canonical Voter and escrow. The 446 local venues yielded 5,047 successful NFT/token `earned` reads, including four successful retries.

Although all observed current-pool reward reads were zero, NFT **407** has these historical claims at pool `0xB0a9166Ff5A6227BD7354A8fc233B93aDe037156`:

| Reward | Amount | Raw amount |
| --- | --- | --- |
| WETH fees | 0.010498609263217862 | 10498609263217862 |
| tBTC fees | 0.000369664862369995 | 369664862369995 |
| T bribes | 4228.113578323456326758 | 4228113578323456326758 |

The [unsigned two-call Safe batch](./2026-10-24-optimism-historical-claims.safe.json) calls the verified deployed Voter's `claimFees` and `claimBribes` methods from Treasury Safe `0x7F4735237c41F7F8578A9C7d10A11e3BCFa3D4A3`. Both calls passed `eth_call` at Optimism block 158634527. The reward contracts send rewards to the NFT's current owner; no arbitrary recipient is encoded. Token addresses, verified function ABIs and all arguments are in the adjacent JSON files. The structured Safe batch uses `data: null`; its generated calldata was checked byte-for-byte against the two simulated calls. The batch contains neither signatures nor a Safe nonce and has not been proposed to a Safe service.

Remaining work:

- Base's complete `Voted` history is unavailable from the bounded public RPC attempts (limits/retry exhaustion). Review all four NFT histories from block 3200601 through snapshot block 53039404, then their historical fee/bribe venues.
- Optimism has **124 remote root reward venues on ten chains**. Their canonical leaf contracts, reward tokens, claim routes, recipients and delivery requirements remain unreviewed; unavailable local `earned` calls were not recorded as zero balances.
- Review both legacy RewardsDistributor rebase paths for all 23 NFTs separately. This fee/bribe investigation does not establish rebase settlement.
- Current `poolVote` lists are observed only: the next index returned an empty revert, without independently attributable bounds data. They cannot establish historical completeness.
- Refresh ownership, accrued amounts, gas and simulations before manual execution. `earned` excludes current-epoch and future accrual. Verify actual receipts and received balances after any claims, and reconcile subsequent accrual before migrating the old NFTs.

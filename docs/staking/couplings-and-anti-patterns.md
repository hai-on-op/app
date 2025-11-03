# Couplings and Anti‑Patterns in Current Staking

This document catalogs architectural couplings that will block or complicate a reusable multi‑staking abstraction (KITE + LP pools), with concrete evidence, severity/impact, and proposed refactors. Each item includes prerequisites and a test plan to support an incremental rollout.

## Summary of Key Findings
- High severity
  - UI copy/assets tightly coupled to KITE across `Overview`, `ManageStaking`, and `Confirm` modal
  - React‑Query cache keys not namespaced; risk of collisions when adding more staking instances
  - Services hard‑wired to global `contracts` config; no per‑pool manager/decimals injection
  - Rewards surfaces bound to current distributor and fixed token set
  - Subgraph assumes singleton ids; no per‑pool scoping
  - Dual data sources (legacy provider/model + react‑query) lead to inconsistency and optimistic/UI drift
- Medium severity
  - Boost logic assumes KITE stake share and appears in KITE‑specific surfaces
  - Mixed APR/summary derivations (legacy vs V2) 
- Low severity
  - Pending withdrawal on‑chain read not implemented in v2 path (null), relying on legacy provider for surface state

---

## 1) UI copy/assets coupled to KITE (High)
Description
- User‑facing strings explicitly reference KITE and stKITE, hard‑coded throughout the staking UI and modals.

Evidence
```45:52:src/components/Modal/StakingTxModal/Confirm.tsx
popupsActions.setWaitingPayload({
    title: 'Waiting For Confirmation',
    text: isStaking ? 'Stake KITE' : isWithdraw ? 'Withdraw KITE' : 'Unstake KITE',
    hint: 'Confirm this transaction in your wallet',
    status: ActionState.LOADING,
})
```
```202:251:src/containers/Stake/Manage/Overview.tsx
<OverviewStat
  ...
  label="My Boosted Value"
/>
<OverviewProgressStat
  ...
  label="My Net Boost:"
  tooltip={`Max Net Boost is achieved when your KITE staking share ...`}
/>
```
```205:233:src/containers/Stake/Manage/ManageStaking.tsx
<Text $fontWeight={700}>Manage KITE Staking</Text>
...
subLabel={`Max ${availableKite} KITE`}
...
unitLabel={'stKITE'}
```

Why it’s risky
- Prevents reusing UI for LP staking without copy/code edits; error‑prone and slows feature addition.

Proposed change
- Extract all user‑facing copy and token labels into `StakingConfig.labels` and render via props.
- Provide per‑pool icons/tokens via config.

Prerequisites
- Introduce `StakingConfig` and pass it through `StakingExperience` (see abstraction spec).

Test plan
- Snapshot test copy for KITE vs a dummy LP staking config.
- Manual verify modals and labels switch correctly when config toggles.

Severity: High  Impact: High  Effort: Medium

---

## 2) Unscoped React‑Query keys (High)
Description
- Query keys lack a `namespace`, causing collisions when multiple staking instances are present.

Evidence
```53:55:src/hooks/staking/useStakeMutations.ts
const accountKey = ['stake', 'account', address?.toLowerCase() || '0x0']
const statsKey = ['stake', 'stats']
```
```16:18:src/hooks/staking/useStakeAccount.ts
queryKey: ['stake', 'account', address?.toLowerCase() || '0x0']
```
```13:15:src/hooks/staking/useStakeStats.ts
queryKey: ['stake', 'stats']
```

Why it’s risky
- Adding LP staking will mix caches between pools; optimistic updates may corrupt UI.

Proposed change
- Introduce `namespace` segment in all keys: `['stake', namespace, ...]` via a hook factory bound to `StakingConfig`.

Prerequisites
- `createStakingClient(config)` to supply namespaced keys.

Test plan
- Instrument dev build to render two dummy namespaces and verify isolated caches.

Severity: High  Impact: High  Effort: Low

---

## 3) Services hard‑wired to global contracts (High)
Description
- `stakingService` reads the global `contracts` singleton and fixed ABIs/addresses.

Evidence
```13:21:src/services/stakingService.ts
const sm = new Contract(contracts.stakingManager.address, contracts.abis.stakingManager, provider)
```

Why it’s risky
- Cannot point to different staking managers per pool; blocks multi‑staking.

Proposed change
- Parameterize services: `buildStakingService(managerAddress, decimals)`; factory returned by `createStakingClient`.

Prerequisites
- `StakingConfig.addresses.manager`, `decimals` defined per instance.

Test plan
- Unit tests for service construction against two different managers.

Severity: High  Impact: High  Effort: Medium

---

## 4) Rewards/claims bound to distributor/token set (High)
Description
- Rewards claim surfaces and distributor service assume fixed token addresses and a single distributor.

Evidence
```88:96:src/services/rewards/incentivesDistributorService.ts
const TOKENS_ADDRESSES: Record<RewardToken, Address> = {
  KITE: contracts.tokens.kite,
  OP: contracts.tokens.op,
  DINERO: '0x9FFc23fd5637bc1A2B73E26d61CF65f9873E8d25' as Address,
  HAI: contracts.tokens.hai,
}
```
```40:63:src/components/Modal/StakingClaimModal.tsx
const rewardsDataMap = { [HAI_ADDRESS]: {...}, [KITE_ADDRESS]: {...}, [OP_ADDRESS]: {...} }
```

Why it’s risky
- LP staking may use different reward sets or none; current approach forces code edits per pool.

Proposed change
- Introduce `RewardModule` interface (getClaims, claimTx, tokensMeta, optional Panel) and inject via `StakingConfig.rewards`.

Prerequisites
- `StakingExperience` to consume reward module for claim displays.

Test plan
- Mock reward modules: distributor vs no‑rewards; verify UI toggles appropriately.

Severity: High  Impact: High  Effort: Medium

---

## 5) Subgraph singleton assumptions (High)
Description
- Subgraph queries assume a single `stakingStatistic(id: "singleton")` and `stakingUser` keyed by address alone.

Evidence
```62:69:src/providers/StakingProvider.tsx
const STAKING_STATS_QUERY = gql`
  query GetStakingStats {
    stakingStatistic(id: "singleton") { totalStaked totalStakers totalRewardsPaid }
  }
`
```

Why it’s risky
- Multiple pools cannot be distinguished; totals and positions will be incorrect.

Proposed change
- Adopt `poolKey` id composition per abstraction spec; client supplies `idForUser/Stats`.

Prerequisites
- Subgraph/indexer updates to write ids as `${poolKey}` and `${poolKey}-${user}`.

Test plan
- Indexer fork with two pools; verify client queries display isolated stats.

Severity: High  Impact: High  Effort: Medium‑High (requires subgraph change)

---

## 6) Dual data sources: legacy provider/model vs react‑query (High)
Description
- Overlapping reads/writes via `StakingProvider` + `stakingModel` and new react‑query hooks leads to inconsistent UI and duplicated optimistic layers.

Evidence
```40:55:src/containers/Stake/Manage/ManageStaking.tsx
const stakingCtx = useStakingData() as any // legacy provider
const accountQuery = useStakeAccount(address as any) // react-query
const statsQuery = useStakeStats() // react-query
const mutations = useStakeMutations(address as any)
```
```540:574:src/model/stakingModel.ts
fetchTotalStaked / fetchUserStakedBalance / fetchUserRewards
```

Why it’s risky
- Race conditions and divergence between caches; harder to reason about optimistic updates.

Proposed change
- Consolidate on react‑query + services for reads/writes; keep provider for analytics/non‑critical aggregates if needed.

Prerequisites
- Namespaced keys, parameterized services.

Test plan
- Remove provider reads from `ManageStaking` behind a flag; A/B verify identical UI values.

Severity: High  Impact: Medium‑High  Effort: Medium

---

“Your notion of evidence is too narrow.”

Not all domains use evidence in the same way: math, phenomenology, ethics, metaphysics.

You can’t simply import lab-experiment standards into all issues (like consciousness, meaning, value) without doing philosophy first.## 7) Boost coupling to KITE stake share (Medium)
Description
- Boost algorithm assumes KITE stake share and is surfaced in KITE UIs.

Evidence
```247:255:src/hooks/useBoost.tsx
const vaultBoost = calculateVaultBoost({ userStakingAmount, totalStakingAmount, ... })
```
```202:251:src/containers/Stake/Manage/Overview.tsx
label="My Boosted Value" / label="My Net Boost:"
```
```125:152:src/components/Modal/StakingTxModal/Confirm.tsx
label: 'Net Boost', value: simulateNetBoost(...)
```

Why it’s risky
- LP staking does not affect boost; showing these surfaces would be misleading.

Proposed change
- Gate boost computation and UI via `config.affectsBoost`; omit rows/tooltips when false.

Prerequisites
- Config plumbing to Overview/Confirm.

Test plan
- Render with `affectsBoost=false` and verify boost surfaces are hidden.

Severity: Medium  Impact: Medium  Effort: Low

---

## 8) Mixed APR/summary derivations (Medium)
Description
- `useStakingSummary` (legacy) vs `useStakingSummaryV2` (react‑query) compute APR and summaries differently.

Evidence
```135:173:src/hooks/useStakingSummary.tsx
const stakingApr = useMemo(() => { /* legacy APY aggregation */ })
```
```59:166:src/hooks/staking/useStakingSummaryV2.ts
const { loading: aprLoading, value: aprValue, formatted: aprFormatted } = useStakeApr()
```

Why it’s risky
- Inconsistent numbers depending on path; complicates abstraction.

Proposed change
- Standardize on a single APR source (prefer the V2 hooks) and remove legacy derivation from staking screens.

Prerequisites
- Remove provider coupling and ensure prices source is consistent.

Test plan
- Compare APR across both implementations in a staging build; deprecate legacy calc.

Severity: Medium  Impact: Medium  Effort: Medium

---

## 9) Pending withdrawal read gap (Low)
Description
- `getPendingWithdrawal` returns null in v2 services; UI falls back to legacy provider’s pending map.

Evidence
```73:77:src/services/stakingService.ts
export async function getPendingWithdrawal(...) { return null }
```

Why it’s risky
- Increases dependency on legacy provider; complicates removal.

Proposed change
- Implement on‑chain pending data or source consistently from subgraph; ensure v2 hook returns a unified shape.

Prerequisites
- Confirm contract API or extend subgraph mapping.

Test plan
- Add unit/integration test for pending state rendering using v2 hook only.

Severity: Low  Impact: Low  Effort: Low‑Medium

---

## Staged Refactor Roadmap
1) Namespacing & cache isolation (High)
   - Add `namespace` to all query keys via factory.
   - Tests: dual namespace sandbox.
2) Copy/config extraction (High)
   - Externalize labels and token strings to `StakingConfig`.
   - Tests: snapshot copy per config.
3) Service parameterization (High)
   - Inject manager/decimals; stop reading global `contracts` in service functions.
   - Tests: two managers.
4) Rewards module injection (High)
   - Implement `RewardModule`; convert claim surfaces.
   - Tests: distributor vs no‑rewards module.
5) Boost gating (Medium)
   - Hide boost when `affectsBoost=false`.
   - Tests: render assertions.
6) Subgraph id scoping (High)
   - Adopt `poolKey` ids; update client id composition.
   - Tests: forked subgraph with two pools.
7) Consolidate data path (High)
   - Remove legacy provider reads/writes from staking screens; keep analytics only if needed.
   - Tests: parity checks and mutation flows.
8) Clean up legacy APR path (Medium)
   - Remove legacy APR; standardize V2.
   - Tests: APR consistency.
9) Implement pending withdrawal in v2 (Low)
   - Add read path to v2 hooks/services.
   - Tests: pending state UI.

## Risks & Mitigations
- Key change collisions: Roll out per step; feature flags for critical screens.
- Subgraph migration timing: Gate client id changes behind config; fall back to legacy ids until indexer updates.
- Rewards variance across pools: Default to no‑rewards module; surface "No rewards" clearly.

## Acceptance Criteria
- A second staking instance can be wired via `StakingConfig` without code edits outside of the config file.
- KITE boost surfaces persist; LP boost surfaces are absent.
- Claiming works for KITE; LP configs can opt in independently.
- No cache collisions across staking instances.



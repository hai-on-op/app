# Site Performance Remediation Plan

## Goal

Make the app feel fast on first load and during route changes by fixing the actual bottlenecks we measured:

- oversized startup JS
- too much provider/query work mounted above the router
- analytics chart over-rendering
- avoidable polling and cache misses
- duplicated route-specific derivation work on earn, stake, and vault pages

This is not a detached-DOM leak first. It is a startup, background-work, and rendering problem.

## Current Findings

- Main app chunk was `4.02 MB` minified before route lazy loading.
- Main app chunk is `3.31 MB` minified after route lazy loading in `src/App.tsx`.
- Heap snapshots did not show detached-node blowup across the main pages.
- `earn` had the largest heap snapshot (`94.8 MB`), with `analytics` second (`82.4 MB`).
- `analytics` is the clearest DOM-heavy outlier:
  - `706` `SVGForeignObjectElement`
  - `711` `SVGCircleElement`
- `src/containers/Analytics/CollateralTable.tsx` does per-row `refetchInterval: 1000`.
- `src/providers/StakingProvider.tsx` globally runs `stakingUsers(first: 1000)` with `fetchPolicy: 'network-only'`.
- `src/providers/VelodromePriceProvider.tsx` sets `cacheTime: 120`, which is effectively `120ms`.

## Principles

- Keep the app shell small and stable.
- Keep heavy data providers route-scoped.
- Keep user-specific or large-list queries out of the global tree.
- Render only what the screen can display.
- Add budgets so regressions become visible in CI.

## Phase 0: Baseline And Guardrails

### Tasks

- [ ] Add a bundle visualizer to `vite.config.ts`.
- [ ] Record build artifact sizes for the main entry chunk and each route chunk.
- [ ] Record route-load measurements for `/vaults`, `/analytics`, `/earn`, and `/stake`.
- [ ] Record route-change measurements for:
  - `/vaults -> /analytics -> /vaults`
  - `/vaults -> /earn -> /vaults`
- [ ] Record JS heap, node count, and listener count after forced GC for the same route flows.
- [ ] Save before/after numbers in a follow-up document or PR description.

### Files

- `vite.config.ts`
- `package.json`
- `docs/site-performance-remediation-plan.md`

### Acceptance Criteria

- [ ] There is one repeatable way to compare bundle size before and after a change.
- [ ] There is one repeatable way to compare route-load and route-change timing before and after a change.
- [ ] Baseline numbers exist for `/vaults`, `/analytics`, `/earn`, and `/stake`.

## Phase 1: Reduce Startup JS

### Tasks

- [x] Lazy-load top-level route components in `src/App.tsx`.
- [ ] Add `manualChunks` in `vite.config.ts` for:
  - wallet stack (`wagmi`, `@rainbow-me/rainbowkit`, `@walletconnect`)
  - protocol stack (`ethers`, `@hai-on-op/sdk`)
  - data stack (`@apollo/client`, `graphql`, `@tanstack/react-query`)
  - chart stack (`@nivo/*`)
- [ ] Lazy-load rare modals and route-rare components mounted from `src/containers/Shared.tsx`.
- [ ] Audit large static assets and convert oversized PNGs to WebP or AVIF where practical.
- [ ] Stop shipping route-only code through the entry path when the user lands on `/vaults`.

### Files

- `src/App.tsx`
- `vite.config.ts`
- `src/containers/Shared.tsx`
- `public/`
- `src/assets/`

### Acceptance Criteria

- [ ] Main entry chunk is under `1.5 MB` minified.
- [ ] Main entry chunk gzip size is materially below the current `~965 kB`.
- [ ] `/vaults` first load no longer pulls code for analytics, stake, earn, and test routes eagerly.
- [ ] Route transitions show route-specific chunk loading instead of one monolithic app chunk.

## Phase 2: Scope Providers To The Routes That Need Them

### Tasks

- [ ] Split the current global provider tree in `src/App.tsx` into:
  - a small app-shell layer
  - route-scoped feature providers
- [ ] Introduce a lightweight shared market/protocol summary source for header-level data.
- [ ] Move the full `AnalyticsProvider` behind the analytics route.
- [ ] Move staking-heavy data behind stake routes.
- [ ] Move claims-heavy and auctions-heavy data behind routes or modals that actually need it.
- [ ] Keep `EffectsProvider` out of the main tree unless the effect is active or the current route needs it.

### Files

- `src/App.tsx`
- `src/providers/AnalyticsProvider/index.tsx`
- `src/providers/AnalyticsProvider/useGebAnalytics.tsx`
- `src/providers/StakingProvider.tsx`
- `src/providers/RewardsProvider/index.tsx`
- `src/providers/ClaimsProvider/index.tsx`
- `src/providers/EffectsProvider/index.tsx`
- `src/containers/Header/index.tsx`
- `src/containers/Shared.tsx`

### Notes

- Do not move all analytics-derived data behind `/analytics` blindly. Some non-analytics surfaces currently call `useAnalytics()`.
- Create a lightweight summary hook/provider first, then move price history, pools, and full analytics history into the analytics route.

### Acceptance Criteria

- [ ] `/vaults` does not mount full analytics history or pool analytics.
- [ ] `/vaults` does not mount stake-history or claim-history providers unless required.
- [ ] Route-level profiling shows fewer requests and less CPU before first paint.
- [ ] Returning from `/analytics` does not retain full analytics history in the global tree.

## Phase 3: Fix Query Policy, Caching, And Polling

### Tasks

- [ ] Fix `src/providers/VelodromePriceProvider.tsx`:
  - replace `cacheTime: 120`
  - set sane `staleTime`
  - set sane `cacheTime`
  - consider lifting this into a true provider if many hooks depend on it
- [ ] Set explicit `QueryClient` defaults in `src/index.tsx` for:
  - `staleTime`
  - `refetchOnWindowFocus`
  - retry behavior
- [ ] Audit large Apollo queries using `fetchPolicy: 'network-only'`.
- [ ] Change read-mostly Apollo queries to `cache-first` or `cache-and-network` unless real-time correctness requires otherwise.
- [ ] Remove per-row polling in `src/containers/Analytics/CollateralTable.tsx`.
- [ ] Replace row-level query timers with one shared `useNow` or countdown context.
- [ ] Audit all `refetchInterval` usage and keep fast polling only for active transaction flows.

### Files

- `src/providers/VelodromePriceProvider.tsx`
- `src/index.tsx`
- `src/providers/StakingProvider.tsx`
- `src/containers/Analytics/CollateralTable.tsx`
- `src/hooks/minter/useMinterBridge.ts`
- `src/hooks/haivelo/useHaiVeloPoolDiscount.ts`
- `src/hooks/minter/useMinterBoostApr.ts`
- `src/hooks/minter/useMinterAccount.ts`
- `src/hooks/minter/useMinterStats.ts`

### Acceptance Criteria

- [ ] No table row mounts its own 1-second query loop.
- [ ] No large list query uses `network-only` from the global tree without a strong reason.
- [ ] Velodrome price data stays warm across route changes instead of thrashing.
- [ ] Background request volume is visibly lower during idle browsing.

## Phase 4: Rebuild The Analytics Chart

### Tasks

- [ ] Remove the per-point tooltip architecture in the line chart.
- [ ] Replace `PointWithPopout` with one shared hover model.
- [ ] Prefer `ResponsiveLineCanvas` if styling requirements allow it.
- [ ] If SVG stays, use a single tooltip and avoid per-point `foreignObject` plus portal rendering.
- [ ] Downsample or decimate price history before rendering.
- [ ] Keep only the visible-resolution number of points for the current viewport and timeframe.

### Files

- `src/components/Charts/Line/index.tsx`
- `src/components/Charts/Line/PointWithPopout.tsx`
- `src/components/Charts/ChartTooltip.tsx`
- `src/styles/Popout.tsx`
- `src/containers/Analytics/HaiPerformance.tsx`
- `src/providers/AnalyticsProvider/index.tsx`

### Acceptance Criteria

- [ ] Analytics no longer renders hundreds of `SVGForeignObjectElement` nodes for one chart.
- [ ] Tooltip rendering uses one shared instance, not one per point.
- [ ] Chart interaction no longer causes the route to feel sticky or janky.
- [ ] Analytics heap remains stable after repeated hover/scrub interaction.

## Phase 5: Stop Global Staking And Claims Work

### Tasks

- [ ] Remove global `stakingUsers(first: 1000)` loading from the app shell.
- [ ] Split staking data into:
  - route summary data
  - user-specific stake data
  - full historical or list data
- [ ] Move auction/claim-heavy calculations off routes that do not show claim state.
- [ ] Lazy-load claim-related and auction-related modals when opened.

### Files

- `src/providers/StakingProvider.tsx`
- `src/providers/ClaimsProvider/index.tsx`
- `src/providers/ClaimsProvider/useMyActiveAuctions.tsx`
- `src/providers/ClaimsProvider/useInternalBalances.tsx`
- `src/components/Modal/ClaimModal.tsx`
- `src/components/Modal/StakingClaimModal.tsx`
- `src/components/Modal/WaitingModal.tsx`

### Acceptance Criteria

- [ ] Stake history and full staking user lists do not load on unrelated routes.
- [ ] Claim and auction calculations do not run globally for disconnected users.
- [ ] Route-load traces show fewer large GraphQL payloads before the route is interactive.

## Phase 6: Simplify Shared Shell Work

### Tasks

- [ ] Audit every effect in `src/containers/Shared.tsx`.
- [ ] Gate token, allowance, liquidation, and proxy bootstrapping by both account state and route need.
- [ ] Move route-specific boot logic out of the global shell where possible.
- [ ] Keep only always-needed wallet/session initialization in the shared layer.

### Files

- `src/containers/Shared.tsx`
- `src/containers/Header/index.tsx`
- `src/services/TransactionUpdater`
- `src/store.ts`
- `src/model/`

### Acceptance Criteria

- [ ] The shared shell does not issue route-irrelevant requests for every route.
- [ ] Connected-user initialization is meaningfully cheaper on non-vault, non-stake routes.
- [ ] Route changes do not trigger repeated global bootstrapping work.

## Phase 7: Route-Specific Cleanup For Earn, Vaults, And Manage Screens

### Tasks

- [ ] Reprofile `/earn` after Phases 1-6, since it had the largest heap snapshot.
- [ ] Audit duplicated APR, price, boost, and summary derivation on earn screens.
- [ ] Deduplicate overlapping minter, haiVELO, and vault overview queries.
- [ ] Pull shared derived values up so they are computed once per route, not once per card.

### Files

- `src/hooks/useEarnStrategies.tsx`
- `src/hooks/useEarnData.ts`
- `src/containers/Earn/`
- `src/containers/Vaults/Manage/index.tsx`
- `src/containers/Vaults/Manage/HaiVeloOverview.tsx`
- `src/containers/Vaults/Manage/Minter/MinterOverview.tsx`
- `src/providers/HaiVeloProvider.tsx`
- `src/providers/MinterProtocolProvider.tsx`

### Acceptance Criteria

- [ ] `/earn` is no longer the heaviest route after the global fixes.
- [ ] Vault manage screens do not duplicate the same fetch and derivation work across overview components.
- [ ] Route-change and interaction cost on vault manage screens is measurably lower.

## Phase 8: Verification And Regression Prevention

### Tasks

- [ ] Re-run build-size comparison after every phase.
- [ ] Re-run heap and route-change profiles after every phase.
- [ ] Add a CI budget check for bundle size.
- [ ] Add a simple Playwright performance smoke test for route load and route transitions.
- [ ] Add a checklist item to PRs that touch providers, polling, or charts.

### Files

- `package.json`
- `vite.config.ts`
- `docs/site-performance-remediation-plan.md`
- CI config files

### Acceptance Criteria

- [ ] Bundle growth is visible in CI.
- [ ] Route-performance regressions are visible before deploy.
- [ ] The repo has a permanent documented performance budget and workflow.

## Recommended Execution Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8

## Definition Of Done

- [ ] Main entry chunk is below budget.
- [ ] `/vaults` no longer pays for analytics, stake, claim, and earn data at startup.
- [ ] Analytics chart no longer mounts hundreds of per-point tooltip nodes.
- [ ] Fast polling is limited to active user workflows.
- [ ] Earn, analytics, and vault pages all show lower route-load and route-change cost.
- [ ] Performance budgets are enforced, not just described.

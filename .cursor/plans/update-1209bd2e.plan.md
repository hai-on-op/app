<!-- 1209bd2e-3ac5-4762-9511-eae14f7e19c8 d78385eb-26b7-4782-9d44-b56b427aa55c -->
## Fix LP Staking Overview Using KITE Balances

### Goals

- Ensure that on LP staking pages (e.g., HAI/VELO LP), the "My Staked" amount and related share stats reflect the user’s LP staking position, not their KITE staking position.
- Keep the existing behavior for the KITE staking page unchanged.

### Plan

1. **Identify where the displayed "My Staked" value comes from**

- Confirm that the HAI/VELO LP staking page uses the shared `StakingExperience` and `Overview` components.
- Trace how `Overview` gets `myStaked` and other values via `useStakingSummaryV2`, and how that hook composes data from the staking hooks.

2. **Find the source of the KITE-only data leak**

- Inspect `useStakingSummaryV2` to see which hooks are scoped by `namespace` (from the `StakingConfig`) and which use defaults.
- Verify that `useStakeEffectiveBalance` and `useStakeShare` currently call `useStakeAccount` / `useStakeStats` without a namespace, thus defaulting to the global KITE staking manager.

3. **Make effective balance and share namespace-aware**

- Update `useStakeEffectiveBalance` in `src/hooks/staking/useStakeEffectiveBalance.ts` to accept an optional `namespace` and `service`, defaulting to `'kite'`/`defaultStakingService` when not provided, and internally call `useStakeAccount(address, namespace, service)`.
- Update `useStakeShare` in `src/hooks/staking/useStakeShare.ts` to accept an optional `namespace` and `service`, defaulting as above, and internally call `useStakeStats(namespace, service)` and `useStakeEffectiveBalance(address, namespace, service)`.

4. **Pass the LP staking namespace through `useStakingSummaryV2`**

- In `src/hooks/staking/useStakingSummaryV2.ts`, pass `namespace` and `service` (derived from the provided `config`) into `useStakeEffectiveBalance` and `useStakeShare` so that LP staking pages use their own manager.
- Keep existing defaults intact when `config` is not provided so that calling `useStakingSummaryV2(address)` without a config still behaves as before for KITE.

5. **Verify UI behavior and tests**

- Confirm in `Overview` that the "My Staked" card is using the `myStaked` value from `useStakingSummaryV2` (which will now be LP-scoped for LP pages).
- Run or conceptually validate the existing tests for `useStakingSummaryV2`, `useStakeShare`, and `useStakeEffectiveBalance` to ensure the new optional parameters and defaults do not break existing KITE behavior.
- Manually reason through: on the HAI/VELO LP page, the displayed "My Staked HAI/VELO LP" should now match the on-chain LP staked balance for that specific manager, independent of the user’s KITE stake.

### To-dos

- [ ] Make `useStakeEffectiveBalance` accept a namespace/service and use them to call `useStakeAccount`, defaulting to KITE when omitted.
- [ ] Make `useStakeShare` accept a namespace/service and use them when calling `useStakeStats` and `useStakeEffectiveBalance`, defaulting to KITE when omitted.
- [ ] Update `useStakingSummaryV2` to pass the staking config’s namespace/service into `useStakeEffectiveBalance` and `useStakeShare` so LP pages use their own manager.
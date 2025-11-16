<!-- 624dd74d-f9b7-42c5-82b3-cdd5afef1605 22b39037-f1a3-4589-ada2-339832770b85 -->
# Plan: Make claim modal LP‑aware

1. **Add "active staking config" context to the claim flow**

- Extend `popupsModel` in `src/model/popupsModel.ts` with an optional field like `stakeClaimNamespace?: string` and a setter action (e.g. `setStakeClaimNamespace`).
- In `StakeStats` (`src/containers/Stake/Stats.tsx`), when the user clicks the Claim button, call both:
- `setIsStakeClaimPopupOpen(true)` (existing behavior), and
- `setStakeClaimNamespace(config?.namespace ?? 'kite')` to record which staking pool initiated the claim.
- This keeps the modal generic but allows it to know which manager/config to use.

2. **Resolve the staking config inside `StakingClaimModal`**

- Import the staking configs (`kiteConfig`, `haiBoldCurveLpConfig`, `haiVeloVeloLpConfig`) into `src/components/Modal/StakingClaimModal.tsx`.
- Read `stakeClaimNamespace` from `popupsModel` via `useStoreState`.
- Build a small namespace→config lookup map and pick the active `StakingConfig` based on `stakeClaimNamespace` (defaulting to `kiteConfig` if undefined or unknown).

3. **Use the correct rewards source per config in the claim modal**

- For **KITE / default**:
- Keep using the existing `useStakingData()` context and `userRewards` (the aggregated global KITE staking manager rewards) so behavior is unchanged.
- For **LP staking configs** (non‑`kite` namespace):
- Ignore `userRewards` and instead call `useStakeAccount(address, config.namespace, service)` with a `buildStakingService(config.addresses.manager, ..., config.decimals)`.
- Derive a `lpRewards` array from `stakeAccount.data?.rewards` and map it to the same shape the modal expects.
- Compute the modal `content` and `Total Estimated Value` from `lpRewards` and the same token price map used in `StakeStats`, with lowercase address keys and safe fallbacks when prices are missing.

4. **Call the appropriate contract when claiming**

- In `onClaim` inside `StakingClaimModal`:
- For **KITE / default**: keep the existing `claimRewards(signer)` from `stakingRewardsService`, so it still hits `contracts.stakingManager.address`.
- For **LP configs**: instead of `claimRewards`, use a service built from `config.addresses.manager` and call its `claimRewards(signer)` method (implemented in `buildStakingService`), which executes `getReward(user)` on the LP staking manager.
- After a successful claim:
- For KITE: keep the existing `refetchAll({})` behavior (refreshes StakingProvider context).
- For LP: optionally trigger a `refetch` on `useStakeAccount` (if exposed) or simply rely on a fresh query via a `key` change/invalidated cache; minimally, ensure the modal closes and does not crash even if LP rewards are slightly stale until the next refresh.

5. **Guardrails and cleanup**

- Make the modal robust to:
- Missing or empty rewards arrays (treat as 0 and show “No rewards available to claim”).
- Unknown reward token addresses (price defaults to 0 instead of throwing).
- Verify that on:
- `/stake` the modal still shows KITE staking rewards and claims from the KITE manager.
- `/stake/hai-bold-curve-lp` and `/stake/hai-velo-velo-lp` the modal shows LP rewards from the respective LP managers and calls `getReward` on those managers when claiming.
- Add or update a small unit/integration test (if practical) to cover opening the claim modal from an LP page and ensure the displayed rewards come from `useStakeAccount` for that LP config rather than from the global `userRewards`. 
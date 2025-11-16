# Staking Abstraction Spec (KITE + LP pools)

This document defines a reusable staking abstraction to support multiple staking instances (KITE + future LP tokens) using the same UI with per-staking configuration, subgraph scoping, and pluggable rewards. Some LP stakings can also participate in boost, using the same KITE-based ratio formula as earn strategies.

## Subgraph scoping (same subgraph)

Goal: Keep existing subgraph schema but scope entities per staking instance.

- Entities remain: `stakingUser`, `stakingStatistic`.
- Introduce a stable `poolKey` per staking instance (e.g., `kite`, `lp-hai-op`, `lp-hai-weth`).
- ID strategy:
  - `stakingUser.id = `${poolKey}-${userAddressLower}`
  - `stakingStatistic.id = `${poolKey}`
- Queries:
  - For user: `stakingUser(id: idForUser(addr))`
  - For stats: `stakingStatistic(id: idForStats())`
- Indexer changes: Ensure handlers set ids with `poolKey` and aggregate per-pool stats while preserving current KITE data under `poolKey = 'kite'`.
- Client: Provide `idForUser`/`idForStats` functions via config; legacy provider can be adapted by composing ids.

## Configuration (per staking instance)

```ts
export type Address = `0x${string}`

export type RewardTokenMeta = {
  address: Address
  symbol: string
  icon?: string
  decimals?: number
}

export type StakingConfig = {
  namespace: string;                // e.g., 'kite', 'lp-hai-op'
  labels: {                         // UI copy
    token: string;                  // 'KITE' | 'LP-HAl/OP'
    stToken?: string;               // 'stKITE' | optional
    stakeVerb?: string;             // defaults to 'Stake'
  };
  addresses: {
    stakeToken: Address;
    stToken?: Address;
    manager: Address;               // staking manager address (per pool if different)
  };
  decimals: number;                 // stake token decimals
  cooldownSeconds?: number;         // optional fixed; else read on-chain
  affectsBoost: boolean;            // true for KITE staking and any LP staking that should affect boost
  subgraph: {
    poolKey: string;                // used in id composition
    userEntity: 'stakingUser';
    statsEntity: 'stakingStatistic';
    idForUser: (addr: string) => string; // `${poolKey}-${addr.toLowerCase()}`
    idForStats: () => string;            // `${poolKey}`
  };
  rewards: RewardModule;            // injectable per-staking override
};

export type ClaimMap = Array<{ tokenAddress: Address; amount: string }>

export type RewardModule = {
  getClaims: (p: { account: Address; provider: any }) => Promise<ClaimMap>;
  getTimer?: (p: { provider: any }) => Promise<{ endTime: number; paused: boolean }>;
  claimTx?: (p: { signer: any }) => Promise<any>;
  tokensMeta?: RewardTokenMeta[];   // ordering/icons for UI
  Panel?: React.ComponentType<{ config: StakingConfig; account?: Address }>; // optional UI injection
};
```

Notes:
- `affectsBoost=false` suppresses all boost UI and calculations for that staking config.
- All user-facing copy comes from `labels`.

## Hook and service factory (namespaced)

Provide a factory that returns scoped hooks, query keys, and services bound to a `StakingConfig`.

```ts
function createStakingClient(config: StakingConfig) {
  const keys = {
    account: (addr?: Address) => ['stake', config.namespace, 'account', addr?.toLowerCase() || '0x0'] as const,
    stats: ['stake', config.namespace, 'stats'] as const,
  }

  return {
    keys,
    useAccount: () => useStakeAccountScoped(config, keys),
    useStats: () => useStakeStatsScoped(config, keys),
    useMutations: () => useStakeMutationsScoped(config, keys),
    useSummary: () => useStakingSummaryScoped(config, keys),
    service: buildStakingService(config.addresses.manager, config.decimals),
  }
}
```

Scoped hook behavior:
- Reads/writes use `config.addresses.manager` and `config.decimals`.
- Query keys include `namespace` to avoid collisions across staking instances.
- Rewards read via `config.rewards` module (instead of hardcoded distributor).

## UI composition seams

Create a reusable `StakingExperience` component that consumes `config` and a `client` from `createStakingClient`.

- Props: `{ config: StakingConfig; client: ReturnType<typeof createStakingClient>; RewardsPanel?: React.ComponentType }`
- Internals:
  - Page shell identical to current `Stake/index.tsx` layout.
  - Manage panel uses client hooks for balances/stats/mutations; labels from `config.labels`.
  - Overview derives from `client.useSummary()`; if `config.affectsBoost === false`, omit boost rows and any boost-driven APR.
  - Rewards panel defaults to `config.rewards.Panel` if provided, else simple list using `config.rewards.getClaims` and `tokensMeta`.
- Modals:
  - `StakingTxModal` receives copy from `config.labels` and leverages `client.useMutations()`.

## Rewards module injection

- KITE adapter: Wraps `incentivesDistributorService` (claims/timer) and provides token meta for `KITE/HAI/OP`.
- LP adapters: per-pool reward definitions; may be a no-op module (no rewards yet).
- Claim surfaces (modal/overview rows) rely exclusively on `config.rewards`.

## Migration guardrails

- Query keys: add `namespace` throughout (`['stake', namespace, ...]`).
- Services: accept `manager`/`decimals` from `config` instead of global `contracts`.
- Copy: replace hardcoded KITE strings with `config.labels`.
- Boost: hide when `affectsBoost=false`.
- Subgraph: client-side id composition uses `config.subgraph.idForUser/Stats`; legacy provider updated to accept a `config`.

## Migration checklist (KITE, no behavior change)

1) Introduce `StakingConfig` for KITE with `namespace='kite'`, `affectsBoost=true`, and current addresses.
2) Implement `createStakingClient(config)` and scoped hooks (thin wrappers around current hooks/services initially).
3) Update react-query keys to include `namespace` (both readers and mutations).
4) Refactor `ManageStaking`, `Overview`, `StakingTxModal` to consume `config` and `client` for copy and actions.
5) Wire KITE rewards via a KITE `RewardModule` adapter using the existing distributor service.
6) Update legacy provider (if kept) to use `config.subgraph` id composition; keep current KITE under `poolKey='kite'`.
7) Verify boost surfaces remain visible and correct for KITE; ensure hidden for LP configs.
8) Smoke test stake/unstake/withdraw/claim flows; confirm cache isolation by `namespace`.

## Example KITE config (illustrative)

```ts
const kiteConfig: StakingConfig = {
  namespace: 'kite',
  labels: { token: 'KITE', stToken: 'stKITE', stakeVerb: 'Stake' },
  addresses: {
    stakeToken: import.meta.env.VITE_KITE_ADDRESS,
    stToken: import.meta.env.VITE_STAKING_TOKEN_ADDRESS,
    manager: import.meta.env.VITE_STAKING_MANAGER,
  },
  decimals: 18,
  cooldownSeconds: 21 * 24 * 60 * 60,
  affectsBoost: true,
  subgraph: {
    poolKey: 'kite',
    userEntity: 'stakingUser',
    statsEntity: 'stakingStatistic',
    idForUser: (a) => `kite-${a.toLowerCase()}`,
    idForStats: () => 'kite',
  },
  rewards: /* KITE reward module adapter */ {} as any,
}
```

## Example LP config (no boost)

```ts
const haiOpLpConfig: StakingConfig = {
  namespace: 'lp-hai-op',
  labels: { token: 'HAI/OP LP', stakeVerb: 'Stake' },
  addresses: {
    stakeToken: '0x...',
    manager: '0x...',
  },
  decimals: 18,
  affectsBoost: false,
  subgraph: {
    poolKey: 'lp-hai-op',
    userEntity: 'stakingUser',
    statsEntity: 'stakingStatistic',
    idForUser: (a) => `lp-hai-op-${a.toLowerCase()}`,
    idForStats: () => 'lp-hai-op',
  },
  rewards: /* LP reward module adapter */ {} as any,
}
```

---

With this abstraction, adding new staking pools becomes configuration-driven without touching core UI logic, while keeping KITE-specific boost behavior isolated behind `affectsBoost` and subgraph scoping.



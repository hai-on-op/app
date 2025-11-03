import type { Address, RewardModule, StakingConfig } from '~/types/stakingConfig'

const rewards: RewardModule = {
    // Wire real distributor in a follow-up; placeholder for labels-driven UI
    async getClaims() {
        return []
    },
}

export const kiteConfig: StakingConfig = {
    namespace: 'kite',
    labels: { token: 'KITE', stToken: 'stKITE', stakeVerb: 'Stake' },
    addresses: {
        stakeToken: import.meta.env.VITE_KITE_ADDRESS as unknown as Address,
        stToken: import.meta.env.VITE_STAKING_TOKEN_ADDRESS as unknown as Address,
        manager: import.meta.env.VITE_STAKING_MANAGER as unknown as Address,
    },
    decimals: 18,
    cooldownSeconds: 21 * 24 * 60 * 60,
    affectsBoost: true,
    subgraph: {
        poolKey: 'kite',
        userEntity: 'stakingUser',
        statsEntity: 'stakingStatistic',
        idForUser: (a: string) => `kite-${a.toLowerCase()}`,
        idForStats: () => 'kite',
    },
    rewards,
}



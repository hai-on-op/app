import type { Address, RewardModule, StakingConfig } from '~/types/stakingConfig'

const rewards: RewardModule = {
    async getClaims() {
        return []
    },
}

export const exampleLpConfig: StakingConfig = {
    namespace: 'lp-demo',
    labels: { token: 'HAI/OP LP', stakeVerb: 'Stake' },
    addresses: {
        stakeToken: '0x0000000000000000000000000000000000000000' as Address,
        manager: '0x0000000000000000000000000000000000000000' as Address,
    },
    decimals: 18,
    affectsBoost: false,
    tvl: {
        source: 'velodrome',
        poolAddress: '0x0000000000000000000000000000000000000000' as Address,
        label: 'LP TVL',
    },
    subgraph: {
        poolKey: 'lp-demo',
        userEntity: 'stakingUser',
        statsEntity: 'stakingStatistic',
        idForUser: (a: string) => `lp-demo-${a.toLowerCase()}`,
        idForStats: () => 'lp-demo',
    },
    rewards,
}

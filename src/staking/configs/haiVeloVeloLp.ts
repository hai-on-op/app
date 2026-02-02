import type { Address, RewardModule, StakingConfig } from '~/types/stakingConfig'

const rewards: RewardModule = {
    async getClaims() {
        return []
    },
}

export const haiVeloVeloLpConfig: StakingConfig = {
    namespace: 'lp-hai-velo-velo',
    labels: { token: 'haiVELO/VELO LP', stToken: 'sthaiVELO/VELO LP', stakeVerb: 'Stake' },
    addresses: {
        stakeToken: '0x5535Cdc333FC8f08f6183e7064202C3917E9346C' as Address, // haiVeloVeloLPToken
        stToken: '0xAA46f6e234d52cC8c3B387A44584a9FB1a62bE0a' as Address, // stakingTokenHaiVeloVeloLP
        manager: '0x13531B3039533860576e01798Df29B6A14fcd1D9' as Address, // stakingManagerHaiVeloVeloLP
    },
    decimals: 18,
    affectsBoost: true,
    tvl: {
        source: 'velodrome',
        poolAddress: '0x5535Cdc333FC8f08f6183e7064202C3917E9346C' as Address,
        label: 'haiVELO/VELO LP TVL',
    },
    subgraph: {
        poolKey: 'lp-hai-velo-velo',
        userEntity: 'haiVeloVeloLPStakingUser',
        statsEntity: 'haiVeloVeloLPStakingStatistic',
        idForUser: (a: string) => a.toLowerCase(),
        idForStats: () => 'singleton',
    },
    rewards,
}

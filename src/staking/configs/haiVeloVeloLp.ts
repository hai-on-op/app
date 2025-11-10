import type { Address, RewardModule, StakingConfig } from '~/types/stakingConfig'

const rewards: RewardModule = {
    async getClaims() {
        return []
    },
}

export const haiVeloVeloLpConfig: StakingConfig = {
    namespace: 'lp-hai-velo-velo',
    labels: { token: 'HAI/VELO LP', stToken: 'stHAI/VELO LP', stakeVerb: 'Stake' },
    addresses: {
        stakeToken: '0x5535Cdc333FC8f08f6183e7064202C3917E9346C' as Address, // haiVeloVeloLPToken
        stToken: '0xFEFE14e370c3Cd9F7e1810b25ECF00d553FD625b' as Address, // stakingTokenHaiVeloVeloLP
        manager: '0xfFf582CE7353026B20264F27770fa7Bdd4Aa6d0E' as Address, // stakingManagerHaiVeloVeloLP
    },
    decimals: 18,
    affectsBoost: false,
    subgraph: {
        poolKey: 'lp-hai-velo-velo',
        userEntity: 'stakingUser',
        statsEntity: 'stakingStatistic',
        idForUser: (a: string) => `lp-hai-velo-velo-${a.toLowerCase()}`,
        idForStats: () => 'lp-hai-velo-velo',
    },
    rewards,
}



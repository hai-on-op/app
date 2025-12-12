import type { Address, RewardModule, StakingConfig } from '~/types/stakingConfig'

const rewards: RewardModule = {
    async getClaims() {
        return []
    },
}

export const haiBoldCurveLpConfig: StakingConfig = {
    namespace: 'lp-hai-bold-curve',
    labels: { token: 'HAI/BOLD LP', stToken: 'stHAI/BOLD LP', stakeVerb: 'Stake' },
    addresses: {
        stakeToken: '0xC4ea2ED83bC9207398fa5dB31Ee4E7477dC34fd5' as Address, // haiBoldCurveLPToken
        stToken: '0xcB7E5bb21b714991bdc6B07Be36Cb897cdd1980F' as Address, // stakingTokenHaiBoldCurveLP
        manager: '0x70bf153870e405097eeec57d0b800fe7ee279e93' as Address, // stakingManagerHaiBoldCurveLP
    },
    decimals: 18,
    cooldownSeconds: 0,
    affectsBoost: true,
    tvl: {
        source: 'curve',
        poolAddress: '0xC4ea2ED83bC9207398fa5dB31Ee4E7477dC34fd5' as Address,
        label: 'HAI/BOLD LP TVL',
    },
    subgraph: {
        poolKey: 'lp-hai-bold-curve',
        userEntity: 'haiBoldCurveLPStakingUser',
        statsEntity: 'haiBoldCurveLPStakingStatistic',
        idForUser: (a: string) => a.toLowerCase(),
        idForStats: () => 'singleton',
    },
    rewards,
}

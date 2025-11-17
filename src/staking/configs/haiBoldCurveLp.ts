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
        stToken: '0x8999eE7089172331Dd5fB3BCa255EdCa52c8b856' as Address, // stakingTokenHaiBoldCurveLP
        manager: '0xD8417Eb963361d7b80648Fd9f153c4ff9CA2a9Cf' as Address, // stakingManagerHaiBoldCurveLP
    },
    decimals: 18,
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



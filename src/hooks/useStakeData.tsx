import { useState } from 'react'

export function useStakingData() {
    return {
        stats: {
            tvl: '$101.5',
            stakedKite: '43.5',
            stakedKiteShare: '37',
            haiBoost: '4.5%',
            stakingRewards: {
                KITE: '14',
                OP: '24',
            },
        },
    }
}

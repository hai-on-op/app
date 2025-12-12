import { useMemo } from 'react'
import type { Address } from '~/services/stakingService'
import { useLpPool } from './useLpPool'
import { useLpUserTotalLiquidity } from './useLpUserTotalLiquidity'
import { useStakeAccount } from '~/hooks/staking/useStakeAccount'
import { useStakeStats } from '~/hooks/staking/useStakeStats'
import { calculateLPBoost } from '~/services/boostService'

export function useLpBoostForUser(address?: Address): { loading: boolean; lpBoost: number; kiteRatio: number } {
    const { data: pool, isLoading: poolLoading } = useLpPool()
    const { loading: liqLoading, value: userLPPosition } = useLpUserTotalLiquidity(address)
    const { data: account, isLoading: acctLoading } = useStakeAccount(address)
    const { data: stats, isLoading: statsLoading } = useStakeStats()

    const totalPoolLiquidity = pool?.liquidity || '0'
    const userStakingAmount = Number(account?.stakedBalance || 0)
    const totalStakingAmount = Number(stats?.totalStaked || 0)

    const loading = poolLoading || liqLoading || acctLoading || statsLoading

    const { lpBoost, kiteRatio } = useMemo(() => {
        if (loading) return { lpBoost: 1, kiteRatio: 0 }
        const res = calculateLPBoost({
            userStakingAmount,
            totalStakingAmount,
            userLPPosition,
            totalPoolLiquidity,
        })
        return { lpBoost: res.lpBoost ?? 1, kiteRatio: res.kiteRatio ?? 0 }
    }, [loading, userStakingAmount, totalStakingAmount, userLPPosition, totalPoolLiquidity])

    return { loading, lpBoost, kiteRatio }
}

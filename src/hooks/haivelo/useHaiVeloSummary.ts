import { useMemo } from 'react'
import { useHaiVeloStats } from './useHaiVeloStats'
import { useHaiVeloAccount } from './useHaiVeloAccount'
import { useHaiVeloCollateralMapping } from './useHaiVeloCollateralMapping'
import { useHaiVeloBoostMap } from './useHaiVeloBoostMap'
import { useStaking } from '~/providers/StakingProvider'

export type UseHaiVeloSummaryResult = {
    loading: boolean
    v1Deposited: string
    v2Deposited: string
    combinedDeposited: string
    v1Balance: string
    v2BalanceFormatted: string
    veNftCount: number
    myBoost?: number
    boostMap?: Record<string, number>
}

export function useHaiVeloSummary(address?: string, haiVeloPriceUsd = 0): UseHaiVeloSummaryResult {
    const { v1, v2, combined, isLoading: statsLoading } = useHaiVeloStats(haiVeloPriceUsd)
    const { v1Balance, v2Balance, veNft, isLoading: acctLoading } = useHaiVeloAccount(address)
    const { mapping, isLoading: mapLoading } = useHaiVeloCollateralMapping()
    const staking = useStaking()

    const boostMap = useHaiVeloBoostMap({
        mapping,
        usersStakingData: staking?.usersStakingData || {},
        totalStaked: Number(staking?.totalStaked || 0),
    })

    const myBoost = useMemo(() => {
        if (!address) return undefined
        return boostMap[address.toLowerCase()] || 1
    }, [address, boostMap])

    const loading = statsLoading || acctLoading || mapLoading

    return {
        loading,
        v1Deposited: v1.totalDeposited,
        v2Deposited: v2.totalDeposited,
        combinedDeposited: combined.totalDeposited,
        v1Balance,
        v2BalanceFormatted: v2Balance.formatted,
        veNftCount: veNft.nfts.length,
        myBoost,
        boostMap,
    }
}

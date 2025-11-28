import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePublicProvider } from '~/hooks'
import { useStakePrices } from './useStakePrices'
import { useStakeStats } from './useStakeStats'
import { formatNumberWithStyle } from '~/utils'
import { fetchCurvePoolApr, calculateKiteIncentivesApr } from '~/services/curvePoolApr'
import { fetchCurveLpTvlForOptimismLp } from '~/services/curveLpTvl'
import type { StakingConfig } from '~/types/stakingConfig'
import { buildStakingService } from '~/services/stakingService'
import { STAKING_REWARDS } from '~/utils/rewards'

export type LpStakingAprResult = {
    loading: boolean
    underlyingApr: number // Curve pool vAPY as decimal (e.g., 0.05 for 5%)
    incentivesApr: number // KITE rewards APR as decimal
    netApr: number // Combined total as decimal
    formatted: {
        underlying: string
        incentives: string
        net: string
    }
    // Debug values for logging
    debug: {
        lpPriceUsd: number
        totalStakedLp: number
        totalStakedValueUsd: number
        dailyKiteReward: number
        kitePrice: number
    }
}

/**
 * Hook to calculate APR for LP staking pools (e.g., HAI-BOLD Curve LP).
 * 
 * Combines:
 * - Underlying LP APY from Curve pool trading fees
 * - KITE incentives APR from staking rewards
 * 
 * @param config - Staking configuration for the LP pool
 */
export function useLpStakingApr(config?: StakingConfig): LpStakingAprResult {
    const provider = usePublicProvider()
    const { data: prices, loading: pricesLoading } = useStakePrices()

    // Build staking service for this config
    const service = useMemo(() => {
        if (!config) return undefined
        return buildStakingService(
            config.addresses.manager as `0x${string}`,
            undefined,
            config.decimals
        )
    }, [config])

    // Get total staked LP tokens
    const { data: stats, isLoading: statsLoading } = useStakeStats(config?.namespace, service)

    // Fetch Curve pool data (TVL and LP price)
    const { data: curveData, isLoading: curveDataLoading } = useQuery({
        queryKey: ['curve', 'lpData', config?.tvl?.poolAddress],
        enabled: Boolean(config?.tvl?.poolAddress && config?.tvl?.source === 'curve'),
        staleTime: 60_000,
        queryFn: async () => {
            if (!config?.tvl?.poolAddress) return null
            return fetchCurveLpTvlForOptimismLp(config.tvl.poolAddress)
        },
    })

    // Fetch underlying APR from Curve pool
    const { data: curveAprData, isLoading: curveAprLoading } = useQuery({
        queryKey: ['curve', 'apr', config?.tvl?.poolAddress],
        enabled: Boolean(config?.tvl?.poolAddress && config?.tvl?.source === 'curve' && provider),
        staleTime: 60_000,
        queryFn: async () => {
            if (!config?.tvl?.poolAddress || !provider) return null
            return fetchCurvePoolApr(
                config.tvl.poolAddress,
                provider,
                curveData?.lpPriceUsd,
                curveData?.tvlUsd
            )
        },
    })

    const loading = pricesLoading || statsLoading || curveDataLoading || curveAprLoading

    const result = useMemo((): LpStakingAprResult => {
        const defaultResult: LpStakingAprResult = {
            loading,
            underlyingApr: 0,
            incentivesApr: 0,
            netApr: 0,
            formatted: {
                underlying: '0%',
                incentives: '0%',
                net: '0%',
            },
            debug: {
                lpPriceUsd: 0,
                totalStakedLp: 0,
                totalStakedValueUsd: 0,
                dailyKiteReward: 0,
                kitePrice: 0,
            },
        }

        if (loading || !config) {
            return defaultResult
        }

        // Get staking reward config for this pool
        const stakingRewardConfig = STAKING_REWARDS[config.namespace as keyof typeof STAKING_REWARDS]
        const dailyKiteReward = stakingRewardConfig?.KITE ?? 0

        // Calculate values
        const lpPriceUsd = curveData?.lpPriceUsd ?? 0
        const totalStakedLp = Number(stats?.totalStaked ?? 0)
        const totalStakedValueUsd = totalStakedLp * lpPriceUsd
        const kitePrice = prices.kitePrice ?? 0

        // Log LP dollar valuation for verification
        console.log(`[useLpStakingApr] ====== LP STAKING APR DEBUG ======`)
        console.log(`[useLpStakingApr] Pool: ${config.namespace}`)
        console.log(`[useLpStakingApr] LP Price USD: $${lpPriceUsd.toFixed(6)}`)
        console.log(`[useLpStakingApr] Total Staked LP Tokens: ${totalStakedLp.toFixed(4)}`)
        console.log(`[useLpStakingApr] Total Staked Value USD: $${totalStakedValueUsd.toFixed(2)}`)
        console.log(`[useLpStakingApr] Daily KITE Reward: ${dailyKiteReward} KITE`)
        console.log(`[useLpStakingApr] KITE Price: $${kitePrice.toFixed(4)}`)

        // Get underlying APR from Curve
        const underlyingApr = curveAprData?.vApy ?? 0
        console.log(`[useLpStakingApr] Underlying LP APY: ${(underlyingApr * 100).toFixed(4)}%`)

        // Calculate KITE incentives APR
        const incentivesApr = calculateKiteIncentivesApr({
            dailyKiteReward,
            kitePrice,
            totalStakedValueUsd,
        })
        console.log(`[useLpStakingApr] KITE Incentives APR: ${(incentivesApr * 100).toFixed(2)}%`)

        // Calculate net APR
        const netApr = underlyingApr + incentivesApr
        console.log(`[useLpStakingApr] Net APR: ${(netApr * 100).toFixed(2)}%`)
        console.log(`[useLpStakingApr] ====================================`)

        return {
            loading: false,
            underlyingApr,
            incentivesApr,
            netApr,
            formatted: {
                underlying: formatNumberWithStyle(underlyingApr * 100, {
                    minDecimals: 2,
                    maxDecimals: 2,
                }) + '%',
                incentives: formatNumberWithStyle(incentivesApr * 100, {
                    minDecimals: 2,
                    maxDecimals: 2,
                }) + '%',
                net: formatNumberWithStyle(netApr * 100, {
                    minDecimals: 2,
                    maxDecimals: 2,
                }) + '%',
            },
            debug: {
                lpPriceUsd,
                totalStakedLp,
                totalStakedValueUsd,
                dailyKiteReward,
                kitePrice,
            },
        }
    }, [loading, config, stats, prices, curveData, curveAprData])

    return result
}


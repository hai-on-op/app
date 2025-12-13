import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePublicProvider } from '~/hooks'
import { useVelodrome } from '~/hooks/useVelodrome'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useStakePrices } from './useStakePrices'
import { useStakeStats } from './useStakeStats'
import { useHaiVeloStats } from '~/hooks/haivelo/useHaiVeloStats'
import { formatNumberWithStyle, VITE_MAINNET_PUBLIC_RPC } from '~/utils'
import { fetchCurvePoolApr, calculateKiteIncentivesApr as calculateCurveKiteApr } from '~/services/curvePoolApr'
import { fetchCurveLpTvlForOptimismLp } from '~/services/curveLpTvl'
import {
    calculateVelodromeLpValueFromPool,
    calculateHaiRewardShare,
    calculateHaiRewardsApr,
    calculateKiteIncentivesApr as calculateVeloKiteApr,
    calculateTradingFeeApr,
} from '~/services/velodromePoolApr'
import { fetchHaiVeloLatestTransferAmount } from '~/services/haiVeloService'
import type { StakingConfig } from '~/types/stakingConfig'
import { buildStakingService } from '~/services/stakingService'
import { STAKING_REWARDS } from '~/utils/rewards'

const HAI_TOKEN_ADDRESS = import.meta.env.VITE_HAI_ADDRESS as string

export type LpStakingAprResult = {
    loading: boolean
    underlyingApr: number // Curve pool vAPY or trading fees APR as decimal (e.g., 0.05 for 5%)
    haiRewardsApr: number // HAI rewards APR for Velodrome pools (shared with haiVELO depositors)
    incentivesApr: number // KITE rewards APR as decimal
    netApr: number // Combined total as decimal
    formatted: {
        underlying: string
        haiRewards: string
        incentives: string
        net: string
    }
    // Label for the underlying APR (varies by pool type)
    underlyingLabel: string
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
 * Hook to calculate APR for LP staking pools.
 *
 * Supports:
 * - Curve LP pools (HAI-BOLD): Underlying vAPY + KITE incentives
 * - Velodrome LP pools (haiVELO/VELO): HAI rewards (shared with haiVELO depositors) + KITE incentives
 *
 * @param config - Staking configuration for the LP pool
 */
export function useLpStakingApr(config?: StakingConfig): LpStakingAprResult {
    const provider = usePublicProvider()
    const { data: prices, loading: pricesLoading } = useStakePrices()

    // Velodrome data sources
    const { data: velodromePools, loading: velodromePoolsLoading } = useVelodrome()
    const { prices: veloPrices, loading: velodromePricesLoading } = useVelodromePrices()

    // haiVELO stats for reward sharing calculation
    const veloPrice = Number(veloPrices?.VELO?.raw || 0)
    const haiVeloPrice = veloPrice // haiVELO is ~1:1 with VELO
    const haiVeloStats = useHaiVeloStats(haiVeloPrice)

    // Build staking service for this config
    const service = useMemo(() => {
        if (!config) return undefined
        return buildStakingService(config.addresses.manager as `0x${string}`, undefined, config.decimals)
    }, [config])

    // Get total staked LP tokens
    const { data: stats, isLoading: statsLoading } = useStakeStats(config?.namespace, service)

    // Determine pool type
    const isCurveLp = config?.tvl?.source === 'curve'
    const isVelodromeLp = config?.tvl?.source === 'velodrome'

    const { data: weeklyHaiReward } = useQuery({
        queryKey: ['weeklyHaiReward', isVelodromeLp],
        queryFn: () => {
            if (!isVelodromeLp) throw new Error('not Velodrome LP')
            return fetchHaiVeloLatestTransferAmount({
                rpcUrl: VITE_MAINNET_PUBLIC_RPC,
                haiTokenAddress: HAI_TOKEN_ADDRESS,
            })
        },
    })

    // Fetch Curve pool data (TVL and LP price)
    const { data: curveData, isLoading: curveDataLoading } = useQuery({
        queryKey: ['curve', 'lpData', config?.tvl?.poolAddress],
        enabled: Boolean(config?.tvl?.poolAddress && isCurveLp),
        staleTime: 60_000,
        queryFn: async () => {
            if (!config?.tvl?.poolAddress) return null
            return fetchCurveLpTvlForOptimismLp(config.tvl.poolAddress)
        },
    })

    // Fetch underlying APR from Curve pool
    const { data: curveAprData, isLoading: curveAprLoading } = useQuery({
        queryKey: ['curve', 'apr', config?.tvl?.poolAddress],
        enabled: Boolean(config?.tvl?.poolAddress && isCurveLp && provider),
        staleTime: 60_000,
        queryFn: async () => {
            if (!config?.tvl?.poolAddress || !provider) return null
            return fetchCurvePoolApr(config.tvl.poolAddress, provider, curveData?.lpPriceUsd, curveData?.tvlUsd)
        },
    })

    // Find Velodrome pool data
    const velodromePool = useMemo(() => {
        if (!isVelodromeLp || !config?.tvl?.poolAddress || !velodromePools?.length) return undefined
        const target = config.tvl.poolAddress.toLowerCase()
        return velodromePools.find((p) => p.address.toLowerCase() === target)
    }, [isVelodromeLp, config?.tvl?.poolAddress, velodromePools])

    // Calculate Velodrome LP value
    const velodromeLpValue = useMemo(() => {
        if (!isVelodromeLp || !velodromePool || veloPrice <= 0) return null
        return calculateVelodromeLpValueFromPool(velodromePool, veloPrice)
    }, [isVelodromeLp, velodromePool, veloPrice])

    const curveLoading = isCurveLp && (curveDataLoading || curveAprLoading)
    const velodromeLoading =
        isVelodromeLp &&
        (velodromePoolsLoading || velodromePricesLoading || haiVeloStats.isLoading || weeklyHaiReward === undefined)

    const loading = pricesLoading || statsLoading || curveLoading || velodromeLoading

    const result = useMemo((): LpStakingAprResult => {
        const defaultResult: LpStakingAprResult = {
            loading,
            underlyingApr: 0,
            haiRewardsApr: 0,
            incentivesApr: 0,
            netApr: 0,
            formatted: {
                underlying: '0%',
                haiRewards: '0%',
                incentives: '0%',
                net: '0%',
            },
            underlyingLabel: isCurveLp ? 'Underlying LP APY' : 'Trading Fees APR',
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
        const kitePrice = prices.kitePrice ?? 0
        const haiPrice = prices.haiPrice ?? 1
        const totalStakedLp = Number(stats?.totalStaked ?? 0)

        // Handle Curve LP pools
        if (isCurveLp) {
            const lpPriceUsd = curveData?.lpPriceUsd ?? 0
            const totalStakedValueUsd = totalStakedLp * lpPriceUsd

            console.log(`[useLpStakingApr] ====== CURVE LP STAKING APR ======`)
            console.log(`[useLpStakingApr] Pool: ${config.namespace}`)
            console.log(`[useLpStakingApr] LP Price USD: $${lpPriceUsd.toFixed(6)}`)
            console.log(`[useLpStakingApr] Total Staked LP Tokens: ${totalStakedLp.toFixed(4)}`)
            console.log(`[useLpStakingApr] Total Staked Value USD: $${totalStakedValueUsd.toFixed(2)}`)
            console.log(`[useLpStakingApr] Daily KITE Reward: ${dailyKiteReward} KITE`)
            console.log(`[useLpStakingApr] KITE Price: $${kitePrice.toFixed(4)}`)

            const underlyingApr = curveAprData?.vApy ?? 0
            console.log(`[useLpStakingApr] Underlying LP APY: ${(underlyingApr * 100).toFixed(4)}%`)

            const incentivesApr = calculateCurveKiteApr({
                dailyKiteReward,
                kitePrice,
                totalStakedValueUsd,
            })
            console.log(`[useLpStakingApr] KITE Incentives APR: ${(incentivesApr * 100).toFixed(2)}%`)

            const netApr = underlyingApr + incentivesApr
            console.log(`[useLpStakingApr] Net APR: ${(netApr * 100).toFixed(2)}%`)
            console.log(`[useLpStakingApr] ====================================`)

            return {
                loading: false,
                underlyingApr,
                haiRewardsApr: 0, // Not applicable for Curve pools
                incentivesApr,
                netApr,
                formatted: {
                    underlying: formatNumberWithStyle(underlyingApr * 100, { minDecimals: 2, maxDecimals: 2 }) + '%',
                    haiRewards: '0%',
                    incentives: formatNumberWithStyle(incentivesApr * 100, { minDecimals: 2, maxDecimals: 2 }) + '%',
                    net: formatNumberWithStyle(netApr * 100, { minDecimals: 2, maxDecimals: 2 }) + '%',
                },
                underlyingLabel: 'Underlying LP APY',
                debug: { lpPriceUsd, totalStakedLp, totalStakedValueUsd, dailyKiteReward, kitePrice },
            }
        }

        // Handle Velodrome LP pools (haiVELO/VELO)
        if (isVelodromeLp && velodromePool && weeklyHaiReward !== undefined) {
            const lpPriceUsd = velodromeLpValue?.lpPriceUsd ?? 0
            const poolTvlUsd = velodromeLpValue?.tvlUsd ?? 0
            const totalStakedValueUsd = totalStakedLp * lpPriceUsd
            const haiVeloDepositTvlUsd = haiVeloStats.combined.tvlUsd

            console.log(`[useLpStakingApr] ====== VELODROME LP STAKING APR ======`)
            console.log(`[useLpStakingApr] Pool: ${config.namespace}`)
            console.log(`[useLpStakingApr] LP Price USD: $${lpPriceUsd.toFixed(6)}`)
            console.log(`[useLpStakingApr] Pool TVL USD: $${poolTvlUsd.toFixed(2)}`)
            console.log(`[useLpStakingApr] Total Staked LP Tokens: ${totalStakedLp.toFixed(4)}`)
            console.log(`[useLpStakingApr] Total Staked Value USD: $${totalStakedValueUsd.toFixed(2)}`)
            console.log(`[useLpStakingApr] haiVELO Deposit TVL: $${haiVeloDepositTvlUsd.toFixed(2)}`)
            console.log(`[useLpStakingApr] Weekly HAI Reward: ${weeklyHaiReward.toFixed(4)} HAI`)

            // Calculate trading fee APR (underlying LP yield)
            const { tradingFeeApr: underlyingApr } = calculateTradingFeeApr({
                token0Fees: velodromePool.token0_fees,
                token1Fees: velodromePool.token1_fees,
                poolTvlUsd,
                veloPrice,
                decimals: velodromePool.decimals,
            })

            // Calculate HAI reward share
            const { lpShare } = calculateHaiRewardShare({
                lpStakedTvlUsd: totalStakedValueUsd,
                haiVeloDepositTvlUsd,
            })

            // Calculate HAI rewards APR (shared with haiVELO depositors)
            const { haiApr: haiRewardsApr } = calculateHaiRewardsApr({
                weeklyHaiReward,
                haiPrice,
                lpShare,
                lpStakedTvlUsd: totalStakedValueUsd,
            })

            // Calculate KITE incentives APR
            const incentivesApr = calculateVeloKiteApr({
                dailyKiteReward,
                kitePrice,
                totalStakedValueUsd,
            })

            const netApr = underlyingApr + haiRewardsApr + incentivesApr
            console.log(`[useLpStakingApr] Trading Fee APR: ${(underlyingApr * 100).toFixed(4)}%`)
            console.log(`[useLpStakingApr] HAI Rewards APR: ${(haiRewardsApr * 100).toFixed(2)}%`)
            console.log(`[useLpStakingApr] KITE Incentives APR: ${(incentivesApr * 100).toFixed(2)}%`)
            console.log(`[useLpStakingApr] Net APR: ${(netApr * 100).toFixed(2)}%`)
            console.log(`[useLpStakingApr] ========================================`)

            return {
                loading: false,
                underlyingApr,
                haiRewardsApr,
                incentivesApr,
                netApr,
                formatted: {
                    underlying: formatNumberWithStyle(underlyingApr * 100, { minDecimals: 2, maxDecimals: 2 }) + '%',
                    haiRewards: formatNumberWithStyle(haiRewardsApr * 100, { minDecimals: 2, maxDecimals: 2 }) + '%',
                    incentives: formatNumberWithStyle(incentivesApr * 100, { minDecimals: 2, maxDecimals: 2 }) + '%',
                    net: formatNumberWithStyle(netApr * 100, { minDecimals: 2, maxDecimals: 2 }) + '%',
                },
                underlyingLabel: 'Trading Fees APR',
                debug: { lpPriceUsd, totalStakedLp, totalStakedValueUsd, dailyKiteReward, kitePrice },
            }
        }

        // Fallback for unsupported pool types
        return defaultResult
    }, [
        loading,
        config,
        stats,
        prices,
        curveData,
        curveAprData,
        isCurveLp,
        isVelodromeLp,
        velodromeLpValue,
        haiVeloStats.combined.tvlUsd,
        weeklyHaiReward,
        veloPrice,
        velodromePool,
    ])

    return result
}

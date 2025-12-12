import { useMemo } from 'react'
import { useIsMutating, useQuery } from '@tanstack/react-query'
import { BigNumber } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { formatNumberWithStyle } from '~/utils'
import { useStakeStats } from './useStakeStats'
import { useStakeAccount } from './useStakeAccount'
import { useStakeApr } from './useStakeApr'
import { useStakePrices } from './useStakePrices'
import { useStakeEffectiveBalance } from './useStakeEffectiveBalance'
import { useStakeShare } from './useStakeShare'
import { useStakingBoost } from '~/hooks/staking/useStakingBoost'
import { useLpStakingApr } from './useLpStakingApr'
import type { Address } from '~/services/stakingService'
import type { StakingConfig } from '~/types/stakingConfig'
import { buildStakingService } from '~/services/stakingService'
import { useVelodrome } from '~/hooks/useVelodrome'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { calculateVelodromePoolTvlUsd } from '~/services/lpTvl'
import type { VelodromeLpData } from '~/hooks/useVelodrome'
import { fetchCurveLpTvlForOptimismLp, type CurveLpTvlResult } from '~/services/curveLpTvl'

export type StakingSummaryDataV2 = {
    loading: boolean
    isOptimistic: boolean
    kitePrice: number
    totalStaked: {
        amount: number
        amountFormatted: string
        usdValue: number
        usdValueFormatted: string
    }
    myStaked: {
        amount: number
        amountFormatted: string
        usdValue: number
        usdValueFormatted: string
        effectiveAmount: number
        effectiveAmountFormatted: string
    }
    myShare: { value: number; percentage: string }
    stakingApr: { value: number; formatted: string }
    // APR breakdown for LP staking pools (Curve, Velodrome)
    aprBreakdown?: {
        underlyingApr: number
        underlyingAprFormatted: string
        haiRewardsApr: number // HAI rewards for Velodrome pools
        haiRewardsAprFormatted: string
        incentivesApr: number
        incentivesAprFormatted: string
        netApr: number
        netAprFormatted: string
        underlyingLabel?: string // "Underlying LP APY" for Curve, "Trading Fees APR" for Velodrome
        // Boost-related fields for LP pools
        boost: number // The user's boost multiplier (1x to 2x)
        boostFormatted: string
        boostedNetApr: number // netApr * boost
        boostedNetAprFormatted: string
    }
    boost: {
        netBoostValue: number
        netBoostFormatted: string
        boostedValue: number
        boostedValueFormatted: string
        haiVeloBoost: number
        lpBoost: number
        haiMintingBoost: number
        haiVeloPositionValue: number
        userLPPositionValue: number
        haiMintingPositionValue: number
    }
    stakingData: any
    simulateNetBoost: (userAfterStakingAmount: number, totalAfterStakingAmount: number) => number
    calculateSimulatedValues: (
        stakingAmount: string,
        unstakingAmount: string
    ) => {
        simulationMode: boolean
        totalStakedAfterTx: number
        myStakedAfterTx: number
        myShareAfterTx: number
        netBoostAfterTx: number
    }
}

export function useStakingSummaryV2(address?: Address, config?: StakingConfig): StakingSummaryDataV2 {
    const service = config
        ? buildStakingService(config.addresses.manager as any, undefined, config.decimals)
        : undefined
    const namespace = config?.namespace
    const { data: stats, isLoading: statsLoading } = useStakeStats(namespace, service)
    const { data: account, isLoading: accountLoading } = useStakeAccount(address, namespace, service)
    // Use standard APR for non-LP pools
    const {
        loading: standardAprLoading,
        value: standardAprValue,
        formatted: standardAprFormatted,
    } = useStakeApr(namespace, service)

    // Use LP-specific APR for Curve LP pools
    const lpApr = useLpStakingApr(config)
    const { data: prices, loading: pricesLoading } = useStakePrices()
    const { loading: effLoading, value: effectiveStaked } = useStakeEffectiveBalance(address, namespace, service)
    const { loading: shareLoading, value: shareValue, percentage } = useStakeShare(address, namespace, service)
    const {
        userLPPositionValue,
        lpBoostValue,
        userTotalValue,
        hvBoost,
        haiMintingBoost,
        haiMintingPositionValue,
        simulateNetBoost,
        netBoostValue,
        haiVeloPositionValue,
        loading: boostLoading,
    } = useStakingBoost(config)

    const isVelodromeLp = Boolean(config?.tvl && config.tvl.source === 'velodrome')
    const isCurveLp = Boolean(config?.tvl && config.tvl.source === 'curve')

    // Velodrome pool + prices for LP valuation
    const { data: velodromePools, loading: velodromePoolsLoading } = useVelodrome()
    const { prices: veloPrices, loading: velodromePricesLoading } = useVelodromePrices()

    // Curve LP price (e.g. HAI/BOLD LP on Optimism) via Curve API
    const { data: curveLpData, isLoading: curveLpLoading } = useQuery<CurveLpTvlResult | null>({
        queryKey: ['curve', 'lpTvl', config?.tvl?.poolAddress],
        enabled: isCurveLp && Boolean(config?.tvl?.poolAddress),
        staleTime: 60_000,
        queryFn: async () => {
            if (!config?.tvl?.poolAddress) return null
            return fetchCurveLpTvlForOptimismLp(config.tvl.poolAddress)
        },
    })

    const velodromePricesBySymbol: Record<string, number> = useMemo(() => {
        if (!veloPrices) return {}

        const entries = Object.entries(veloPrices) as [string, { raw: string }][]
        return entries.reduce<Record<string, number>>((acc, [symbol, value]) => {
            const numeric = parseFloat(value.raw)
            if (!Number.isNaN(numeric)) {
                acc[symbol.toUpperCase()] = numeric
            }
            return acc
        }, {})
    }, [veloPrices])

    const velodromePool = useMemo<VelodromeLpData | undefined>(() => {
        if (!config?.tvl?.poolAddress || !velodromePools?.length) return undefined
        const target = config.tvl.poolAddress.toLowerCase()
        return velodromePools.find((p) => p.address.toLowerCase() === target)
    }, [config?.tvl?.poolAddress, velodromePools])

    const lpPriceUsd = useMemo(() => {
        if (!isVelodromeLp || !velodromePool) return prices.kitePrice || 0

        const tvlUsd = calculateVelodromePoolTvlUsd(velodromePool, velodromePricesBySymbol)
        if (!tvlUsd || !Number.isFinite(tvlUsd) || tvlUsd <= 0) {
            return prices.kitePrice || 0
        }

        try {
            const supply = parseFloat(formatUnits(BigNumber.from(velodromePool.liquidity), velodromePool.decimals))
            if (!supply || !Number.isFinite(supply) || supply <= 0) {
                return prices.kitePrice || 0
            }
            const perLp = tvlUsd / supply
            return perLp > 0 && Number.isFinite(perLp) ? perLp : prices.kitePrice || 0
        } catch {
            return prices.kitePrice || 0
        }
    }, [isVelodromeLp, velodromePool, velodromePricesBySymbol, prices.kitePrice])
    // Derive optimistic state from active staking-related mutations
    const mutStake = useIsMutating({ mutationKey: ['stake', 'mut', 'stake'] })
    const mutInit = useIsMutating({ mutationKey: ['stake', 'mut', 'initiateWithdrawal'] })
    const mutWdraw = useIsMutating({ mutationKey: ['stake', 'mut', 'withdraw'] })
    const mutCancel = useIsMutating({ mutationKey: ['stake', 'mut', 'cancelWithdrawal'] })
    const mutClaim = useIsMutating({ mutationKey: ['stake', 'mut', 'claimRewards'] })
    const isOptimistic = mutStake + mutInit + mutWdraw + mutCancel + mutClaim > 0

    const velodromeLoading = isVelodromeLp && (velodromePoolsLoading || velodromePricesLoading)
    const curveLoading = isCurveLp && curveLpLoading

    // Use LP APR loading for LP pools (Curve or Velodrome), standard APR loading otherwise
    const isLpPool = isCurveLp || isVelodromeLp
    const aprLoading = isLpPool ? lpApr.loading : standardAprLoading

    const loading =
        statsLoading ||
        accountLoading ||
        aprLoading ||
        pricesLoading ||
        effLoading ||
        shareLoading ||
        boostLoading ||
        velodromeLoading ||
        curveLoading

    const totalStakedAmount = Number(stats?.totalStaked || 0)
    const myAmount = Number(account?.stakedBalance || 0)

    const perUnitPrice = isVelodromeLp ? lpPriceUsd : isCurveLp ? curveLpData?.lpPriceUsd ?? 0 : prices.kitePrice || 0

    const totalStakedUSD = totalStakedAmount * perUnitPrice
    const myStakedUSD = effectiveStaked * perUnitPrice

    // For LP pools (Curve or Velodrome), use boosted net APR; otherwise use standard APR
    // APR value is in basis points for standard APR (100 = 1%) but decimal for LP APR
    // Only apply the LP boost to KITE incentives, not the underlying APY
    const lpBoost = lpBoostValue ?? 1
    const boostedIncentivesApr = lpApr.incentivesApr * lpBoost
    const boostedNetApr = lpApr.underlyingApr + lpApr.haiRewardsApr + boostedIncentivesApr
    const boostedNetAprFormatted = formatNumberWithStyle(boostedNetApr * 100, { minDecimals: 2, maxDecimals: 2 }) + '%'

    const stakingApr = useMemo(
        () =>
            isLpPool
                ? {
                      value: boostedNetApr * 10000, // Convert decimal to basis points for consistency
                      formatted: boostedNetAprFormatted,
                  }
                : { value: standardAprValue, formatted: standardAprFormatted },
        [isLpPool, boostedNetApr, boostedNetAprFormatted, standardAprValue, standardAprFormatted]
    )

    // APR breakdown for LP pools (used in tooltip)
    // For Velodrome pools, underlyingLabel is "Trading Fees APR" and haiRewardsApr is separate
    const boostedIncentivesAprFormatted =
        formatNumberWithStyle(boostedIncentivesApr * 100, { minDecimals: 2, maxDecimals: 2 }) + '%'
    const aprBreakdown = useMemo(
        () =>
            isLpPool
                ? {
                      underlyingApr: lpApr.underlyingApr,
                      underlyingAprFormatted: lpApr.formatted.underlying,
                      haiRewardsApr: lpApr.haiRewardsApr,
                      haiRewardsAprFormatted: lpApr.formatted.haiRewards,
                      incentivesApr: lpApr.incentivesApr,
                      incentivesAprFormatted: lpApr.formatted.incentives,
                      netApr: lpApr.netApr,
                      netAprFormatted: lpApr.formatted.net,
                      underlyingLabel: lpApr.underlyingLabel, // "Underlying LP APY" for Curve, "Trading Fees APR" for Velodrome
                      // Boost-related fields
                      boost: lpBoost,
                      boostFormatted: formatNumberWithStyle(lpBoost, { minDecimals: 2, maxDecimals: 2 }) + 'x',
                      boostedIncentivesApr,
                      boostedIncentivesAprFormatted,
                      boostedNetApr,
                      boostedNetAprFormatted,
                  }
                : undefined,
        [
            isLpPool,
            lpApr.underlyingApr,
            lpApr.formatted.underlying,
            lpApr.haiRewardsApr,
            lpApr.formatted.haiRewards,
            lpApr.incentivesApr,
            lpApr.formatted.incentives,
            lpApr.netApr,
            lpApr.formatted.net,
            lpApr.underlyingLabel,
            lpBoost,
            boostedIncentivesApr,
            boostedIncentivesAprFormatted,
            boostedNetApr,
            boostedNetAprFormatted,
        ]
    )

    const summary = useMemo(() => {
        return {
            loading,
            isOptimistic,
            kitePrice: prices.kitePrice || 0,
            totalStaked: {
                amount: totalStakedAmount,
                amountFormatted: formatNumberWithStyle(totalStakedAmount, { minDecimals: 0, maxDecimals: 2 }),
                usdValue: totalStakedUSD,
                usdValueFormatted: formatNumberWithStyle(totalStakedUSD, {
                    minDecimals: 0,
                    maxDecimals: 2,
                    style: 'currency',
                }),
            },
            myStaked: {
                amount: myAmount,
                amountFormatted: formatNumberWithStyle(myAmount, { minDecimals: 0, maxDecimals: 2 }),
                effectiveAmount: effectiveStaked,
                effectiveAmountFormatted: formatNumberWithStyle(effectiveStaked, { minDecimals: 0, maxDecimals: 2 }),
                usdValue: myStakedUSD,
                usdValueFormatted: formatNumberWithStyle(myStakedUSD, {
                    minDecimals: 0,
                    maxDecimals: 2,
                    style: 'currency',
                }),
            },
            myShare: { value: shareValue, percentage },
            stakingApr,
            aprBreakdown,
            boost: {
                netBoostValue,
                netBoostFormatted: formatNumberWithStyle(netBoostValue, { minDecimals: 0, maxDecimals: 2 }) + 'x',
                boostedValue: userTotalValue,
                boostedValueFormatted: formatNumberWithStyle(userTotalValue, {
                    minDecimals: 0,
                    maxDecimals: 2,
                    style: 'currency',
                }),
                haiVeloBoost: hvBoost,
                lpBoost: lpBoostValue,
                haiMintingBoost,
                haiVeloPositionValue:
                    typeof haiVeloPositionValue === 'string' ? Number(haiVeloPositionValue) : haiVeloPositionValue || 0,
                userLPPositionValue:
                    typeof userLPPositionValue === 'string' ? Number(userLPPositionValue) : userLPPositionValue || 0,
                haiMintingPositionValue,
            },
            stakingData: account || {},
            simulateNetBoost,
            calculateSimulatedValues: (stakingAmount: string, unstakingAmount: string) => {
                const stakeAmountNum = Number(stakingAmount) || 0
                const unstakeAmountNum = Number(unstakingAmount) || 0
                const simulationMode = Boolean(
                    (stakingAmount || unstakingAmount) && (stakeAmountNum > 0 || unstakeAmountNum > 0)
                )
                const totalStakedAfterTx = totalStakedAmount + stakeAmountNum - unstakeAmountNum
                const myStakedAfterTx = effectiveStaked + stakeAmountNum - unstakeAmountNum
                const myShareAfterTx = totalStakedAfterTx !== 0 ? (myStakedAfterTx / totalStakedAfterTx) * 100 : 0
                const netBoostAfterTx = simulateNetBoost(myStakedAfterTx, totalStakedAfterTx)
                return { simulationMode, totalStakedAfterTx, myStakedAfterTx, myShareAfterTx, netBoostAfterTx }
            },
        }
    }, [
        loading,
        isOptimistic,
        prices.kitePrice,
        totalStakedAmount,
        totalStakedUSD,
        myAmount,
        effectiveStaked,
        myStakedUSD,
        shareValue,
        percentage,
        stakingApr,
        aprBreakdown,
        netBoostValue,
        userTotalValue,
        hvBoost,
        lpBoostValue,
        haiVeloPositionValue,
        userLPPositionValue,
        haiMintingBoost,
        haiMintingPositionValue,
        account,
        simulateNetBoost,
    ])

    return summary
}

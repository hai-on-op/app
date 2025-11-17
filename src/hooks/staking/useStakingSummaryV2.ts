import { useMemo, useCallback } from 'react'
import { useIsMutating } from '@tanstack/react-query'
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
import type { Address } from '~/services/stakingService'
import type { StakingConfig } from '~/types/stakingConfig'
import { buildStakingService } from '~/services/stakingService'
import { useVelodrome } from '~/hooks/useVelodrome'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { calculateVelodromePoolTvlUsd } from '~/services/lpTvl'
import type { VelodromeLpData } from '~/hooks/useVelodrome'

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
    const { loading: aprLoading, value: aprValue, formatted: aprFormatted } = useStakeApr(namespace, service)
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

    // Velodrome pool + prices for LP valuation
    const { data: velodromePools, loading: velodromePoolsLoading } = useVelodrome()
    const { prices: veloPrices, loading: velodromePricesLoading } = useVelodromePrices()

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
    const isOptimistic = (mutStake + mutInit + mutWdraw + mutCancel + mutClaim) > 0

    const velodromeLoading = isVelodromeLp && (velodromePoolsLoading || velodromePricesLoading)

    const loading =
        statsLoading ||
        accountLoading ||
        aprLoading ||
        pricesLoading ||
        effLoading ||
        shareLoading ||
        boostLoading ||
        velodromeLoading

    const totalStakedAmount = Number(stats?.totalStaked || 0)
    const myAmount = Number(account?.stakedBalance || 0)

    const perUnitPrice = isVelodromeLp ? lpPriceUsd : prices.kitePrice || 0

    const totalStakedUSD = totalStakedAmount * perUnitPrice
    const myStakedUSD = effectiveStaked * perUnitPrice

    const stakingApr = { value: aprValue, formatted: aprFormatted }

    const summary = useMemo(() => {
        return {
            loading,
            isOptimistic,
            kitePrice: prices.kitePrice || 0,
            totalStaked: {
                amount: totalStakedAmount,
                amountFormatted: formatNumberWithStyle(totalStakedAmount, { minDecimals: 0, maxDecimals: 2 }),
                usdValue: totalStakedUSD,
                usdValueFormatted: formatNumberWithStyle(totalStakedUSD, { minDecimals: 0, maxDecimals: 2, style: 'currency' }),
            },
            myStaked: {
                amount: myAmount,
                amountFormatted: formatNumberWithStyle(myAmount, { minDecimals: 0, maxDecimals: 2 }),
                effectiveAmount: effectiveStaked,
                effectiveAmountFormatted: formatNumberWithStyle(effectiveStaked, { minDecimals: 0, maxDecimals: 2 }),
                usdValue: myStakedUSD,
                usdValueFormatted: formatNumberWithStyle(myStakedUSD, { minDecimals: 0, maxDecimals: 2, style: 'currency' }),
            },
            myShare: { value: shareValue, percentage },
            stakingApr,
            boost: {
                netBoostValue,
                netBoostFormatted: formatNumberWithStyle(netBoostValue, { minDecimals: 0, maxDecimals: 2 }) + 'x',
                boostedValue: userTotalValue,
                boostedValueFormatted: formatNumberWithStyle(userTotalValue, { minDecimals: 0, maxDecimals: 2, style: 'currency' }),
                haiVeloBoost: hvBoost,
                lpBoost: lpBoostValue,
                haiMintingBoost,
                haiVeloPositionValue: typeof haiVeloPositionValue === 'string' ? Number(haiVeloPositionValue) : haiVeloPositionValue || 0,
                userLPPositionValue: typeof userLPPositionValue === 'string' ? Number(userLPPositionValue) : userLPPositionValue || 0,
                haiMintingPositionValue,
            },
            stakingData: account || {},
            simulateNetBoost,
            calculateSimulatedValues: (stakingAmount: string, unstakingAmount: string) => {
                const stakeAmountNum = Number(stakingAmount) || 0
                const unstakeAmountNum = Number(unstakingAmount) || 0
                const simulationMode = Boolean((stakingAmount || unstakingAmount) && (stakeAmountNum > 0 || unstakeAmountNum > 0))
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



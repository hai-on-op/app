import { useMemo } from 'react'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useAccount } from 'wagmi'
import { formatUnits } from 'ethers/lib/utils'
import { useLPData } from '~/providers/LPDataProvider'
import { useVelodromePositions } from './useVelodrome'
import { calculatePositionValue } from '~/utils/uniswapV3'
import { formatNumberWithStyle } from '~/utils'
import { useStakingData } from './useStakingData'
import { useHaiVeloData } from './useHaiVeloData'
import { useAnalytics } from '~/providers/AnalyticsProvider'

export function useBoost() {
    const { address } = useAccount()
    const { pool, userPositions, loading: lpDataLoading } = useLPData()
    const { data: veloPositions, loading: positionsLoading } = useVelodromePositions()
    const { prices: veloPrices } = useVelodromePrices()
    const { stakingData, stakingStats, loading: stakingLoading } = useStakingData()
    const { userHaiVELODeposited, totalHaiVELODeposited } = useHaiVeloData()

    const {
        haiMarketPrice,
        data: { tokenAnalyticsData },
    } = useAnalytics()

    // Get HAI and WETH prices from analytics provider
    const haiPrice = useMemo(() => parseFloat(haiMarketPrice.raw || '0'), [haiMarketPrice])

    const wethPrice = useMemo(() => {
        // Find WETH in the token analytics data
        const wethData = tokenAnalyticsData.find((token) => token.symbol === 'WETH')
        // Convert from wei to ETH (18 decimals)
        return wethData ? parseFloat(formatUnits(wethData.currentPrice.toString(), 18)) : 0
    }, [tokenAnalyticsData])

    // Get token prices (ideally would come from a price oracle)
    // For now using token0Price and token1Price from the pool as approximate USD values
    // In a real implementation, you would need to convert to actual USD prices
    const token0UsdPrice = haiPrice
    const token1UsdPrice = wethPrice

    // Calculate total user LP position value using V3 formulas
    const calculatedUserLPPositionValue = useMemo(() => {
        if (!userPositions || !pool || userPositions.length === 0) return '0'

        // Calculate value for each position and sum them
        const totalValue = userPositions.reduce((sum, position) => {
            const positionValue = calculatePositionValue(position, pool, token0UsdPrice, token1UsdPrice)
            return sum + positionValue
        }, 0)

        return totalValue.toString()
    }, [userPositions, pool, token0UsdPrice, token1UsdPrice])

    // Calculate user's total liquidity (for boost calculation)
    const userTotalLiquidity = useMemo(() => {
        if (!userPositions || userPositions.length === 0) return '0'

        return userPositions
            .reduce((sum, position) => {
                return sum + Number(position.liquidity)
            }, 0)
            .toString()
    }, [userPositions])

    // Calculate user's share percentage
    const userSharePercentage = useMemo(() => {
        if (!userTotalLiquidity || !pool?.liquidity || Number(pool.liquidity) === 0) return 0

        return (Number(userTotalLiquidity) / Number(pool.liquidity)) * 100
    }, [userTotalLiquidity, pool])

    // KITE staking data
    const userKITEStaked = useMemo(() => {
        return stakingLoading ? '0' : stakingData.stakedBalance
    }, [stakingData, stakingLoading])

    const totalKITEStaked = useMemo(() => {
        return stakingLoading ? '0' : stakingStats.totalStaked
    }, [stakingStats, stakingLoading])

    // Calculate user's stake percentage
    const userStakePercentage = useMemo(() => {
        if (!userKITEStaked || !totalKITEStaked || Number(totalKITEStaked) === 0) return 0

        return (Number(userKITEStaked) / Number(totalKITEStaked)) * 100
    }, [userKITEStaked, totalKITEStaked])

    // Calculate HAI/WETH LP boost based on the provided formula:
    // (amount of HAI/WETH LP user deposited / total amount of HAI/WETH LP deposited) / (# of KITE user staked / # of all KITE staked) + 1
    const haiWethLpBoost = useMemo(() => {
        if (!userTotalLiquidity || !pool?.liquidity || Number(pool.liquidity) === 0) return 1.0
        if (!userKITEStaked || !totalKITEStaked || Number(totalKITEStaked) === 0 || Number(userKITEStaked) === 0)
            return 1.0

        const lpRatio = Number(userTotalLiquidity) / Number(pool.liquidity)
        const kiteRatio = Number(userKITEStaked) / Number(totalKITEStaked)

        // Apply the formula
        const boost = lpRatio / kiteRatio + 1

        // Capped at maximum of 2.5
        const cappedBoost = Math.min(boost, 2.5)

        return cappedBoost
    }, [userTotalLiquidity, pool?.liquidity, userKITEStaked, totalKITEStaked])

    // Calculate haiVELO boost based on the provided formula:
    // (# of KITE user staked / # of all KITE staked) / (# of haiVELO user deposited / all haiVELO deposited) + 1
    const haiVeloBoost = useMemo(() => {
        if (!userKITEStaked || !totalKITEStaked || Number(totalKITEStaked) === 0 || Number(userKITEStaked) === 0)
            return 1.0
        if (
            !userHaiVELODeposited ||
            !totalHaiVELODeposited ||
            Number(totalHaiVELODeposited) === 0 ||
            Number(userHaiVELODeposited) === 0
        )
            return 1.0

        const kiteRatio = Number(userKITEStaked) / Number(totalKITEStaked)
        const haiVeloRatio = Number(userHaiVELODeposited) / Number(totalHaiVELODeposited)

        // Apply the formula
        const boost = kiteRatio / haiVeloRatio + 1

        // Capped at maximum of 2
        const cappedBoost = Math.min(boost, 2)

        return cappedBoost
    }, [userKITEStaked, totalKITEStaked, userHaiVELODeposited, totalHaiVELODeposited])

    // Formatted values for display
    // Formatted values for display
    const formattedValues = useMemo(() => {
        return {
            // Format liquidity for display (shortened with K, M, B suffix)
            userLiquidity: formatNumberWithStyle(Number(userTotalLiquidity), {
                maxDecimals: 2,
                minDecimals: 0,
                suffixed: true,
            }),

            totalLiquidity: formatNumberWithStyle(Number(pool?.liquidity || 0), {
                maxDecimals: 2,
                minDecimals: 0,
                suffixed: true,
            }),

            // Format position value in USD with 3 decimals
            positionValue: formatNumberWithStyle(Number(calculatedUserLPPositionValue), {
                style: 'currency',
                maxDecimals: 3,
                minDecimals: 3,
            }),

            // Format share as percentage with 4 decimals
            sharePercentage:
                formatNumberWithStyle(userSharePercentage, {
                    maxDecimals: 4,
                    minDecimals: 4,
                }) + '%',

            // Format staking data
            userStaked: formatNumberWithStyle(Number(userKITEStaked), {
                maxDecimals: 2,
                minDecimals: 2,
            }),

            totalStaked: formatNumberWithStyle(Number(totalKITEStaked), {
                maxDecimals: 0,
                minDecimals: 0,
                suffixed: true,
            }),

            stakePercentage:
                formatNumberWithStyle(userStakePercentage, {
                    maxDecimals: 4,
                    minDecimals: 4,
                }) + '%',

            // Format HAI/WETH LP boost
            haiWethLpBoost:
                formatNumberWithStyle(haiWethLpBoost, {
                    maxDecimals: 3,
                    minDecimals: 3,
                }) + 'x',

            // Format haiVELO boost
            haiVeloBoost:
                formatNumberWithStyle(haiVeloBoost, {
                    maxDecimals: 3,
                    minDecimals: 3,
                }) + 'x',
        }
    }, [
        userTotalLiquidity,
        pool?.liquidity,
        calculatedUserLPPositionValue,
        userSharePercentage,
        userKITEStaked,
        totalKITEStaked,
        userStakePercentage,
        haiWethLpBoost,
        haiVeloBoost,
    ])

    // LP Position data
    const userLPPosition = userTotalLiquidity
    const totalPoolLiquidity = pool?.liquidity || '0'
    const userLPPositionValue = calculatedUserLPPositionValue

    // Calculate haiVELO position value in USD using VELO price
    const haiVeloPositionValue = useMemo(() => {
        // Use the same price as VELO for haiVELO
        const veloPrice = parseFloat(veloPrices?.VELO?.raw || '0')
        const haiVeloAmount = parseFloat(userHaiVELODeposited || '0')

        return (haiVeloAmount * veloPrice).toString()
    }, [userHaiVELODeposited, veloPrices])

    // Calculate Net Boost (weighted average of both boosts based on dollar value)
    const netBoost = useMemo(() => {
        const lpValue = parseFloat(userLPPositionValue || '0')
        const haiVeloValue = parseFloat(haiVeloPositionValue || '0')
        const totalValue = lpValue + haiVeloValue

        if (totalValue === 0) return 1.0

        // Calculate weighted components
        const lpBoostComponent = haiWethLpBoost * (lpValue / totalValue)
        const haiVeloBoostComponent = haiVeloBoost * (haiVeloValue / totalValue)

        // Calculate combined boost
        const combined = lpBoostComponent + haiVeloBoostComponent

        return combined
    }, [userLPPositionValue, haiVeloPositionValue, haiWethLpBoost, haiVeloBoost])

    // Replace the old boostFactor calculation with the netBoost
    const boostFactor = netBoost.toFixed(2)
    const maxBoostFactor = '2.0'
    const boostProgress = (parseFloat(boostFactor) - 1.0) / (parseFloat(maxBoostFactor) - 1.0)

    // Boosted vaults count
    const boostedVaultsCount = 0

    const userKiteRatio =
        isNaN(Number(totalKITEStaked)) || Number(totalKITEStaked) === 0
            ? 0
            : Number(userKITEStaked) / Number(totalKITEStaked)
    const haiVeloRatio = Number(userHaiVELODeposited) / Number(totalHaiVELODeposited)
    const boostValue = Number(haiVeloRatio) === 0 ? 1 : userKiteRatio / haiVeloRatio + 1

    const reduceFactor = 1

    const hvBoost = Math.min(boostValue * reduceFactor, 2)

    const lpRatio = Number(totalPoolLiquidity) === 0 ? 0 : Number(userLPPosition) / Number(totalPoolLiquidity)

    const rawLpBoostValue = Number(lpRatio) === 0 ? 1 : userKiteRatio / lpRatio + 1

    const lpBoostValue = Math.min(rawLpBoostValue * reduceFactor, 2)

    const userTotalValue = Number(userLPPositionValue) + Number(haiVeloPositionValue)

    const hvValueRatio = userTotalValue === 0 ? 0.5 : Number(haiVeloPositionValue) / userTotalValue
    const lpValueRatio = userTotalValue === 0 ? 0.5 : Number(userLPPositionValue) / userTotalValue

    const hvWeightedBoost = hvBoost * hvValueRatio
    const lpWeightedBoost = lpBoostValue * lpValueRatio

    const netBoostValue = hvWeightedBoost + lpWeightedBoost

    const simulateNetBoost = (userAfterStakingAmount: number, totalAfterStakingAmount: number) => {
        const userKiteRatio =
            isNaN(Number(totalAfterStakingAmount)) || Number(totalAfterStakingAmount) === 0
                ? 0
                : Number(userAfterStakingAmount) / Number(totalAfterStakingAmount)
        const haiVeloRatio = Number(userHaiVELODeposited) / Number(totalHaiVELODeposited)
        const boostValue = Number(haiVeloRatio) === 0 ? 1 : userKiteRatio / haiVeloRatio + 1

        const reduceFactor = 1

        const hvBoost = Math.min(boostValue * reduceFactor, 2)

        const lpRatio = Number(totalPoolLiquidity) === 0 ? 0 : Number(userLPPosition) / Number(totalPoolLiquidity)

        const rawLpBoostValue = Number(lpRatio) === 0 ? 1 : userKiteRatio / lpRatio + 1

        const lpBoostValue = Math.min(rawLpBoostValue * reduceFactor, 2)

        const userTotalValue = Number(userLPPositionValue) + Number(haiVeloPositionValue)

        const hvValueRatio = userTotalValue === 0 ? 0.5 : Number(haiVeloPositionValue) / userTotalValue
        const lpValueRatio = userTotalValue === 0 ? 0.5 : Number(userLPPositionValue) / userTotalValue

        return netBoostValue
    }

    return {
        // HaiVELO data
        userHaiVELODeposited,
        totalHaiVELODeposited,
        haiVeloPositionValue,

        // KITE staking data
        userKITEStaked,
        totalKITEStaked,
        userStakePercentage,

        // LP Position data
        userLPPosition,
        totalPoolLiquidity,
        userLPPositionValue,

        // HAI/WETH LP boost data
        haiWethLpBoost,

        // haiVELO boost data
        haiVeloBoost,

        hvBoost,
        lpBoostValue,
        userTotalValue,

        // Net boost data
        netBoost,
        netBoostValue,

        // Formatted values for display
        formattedValues,
        userSharePercentage,

        // Boost calculations
        boostFactor,
        maxBoostFactor,
        boostProgress,

        // Boosted vaults
        boostedVaultsCount,

        simulateNetBoost,

        // Loading state
        loading: lpDataLoading || positionsLoading || stakingLoading,
    }
}

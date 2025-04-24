import { useMemo, useCallback } from 'react'
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

    // KITE staking data
    const userKITEStaked = useMemo(() => {
        return stakingLoading ? '0' : stakingData.stakedBalance
    }, [stakingData, stakingLoading])

    const totalKITEStaked = useMemo(() => {
        return stakingLoading ? '0' : stakingStats.totalStaked
    }, [stakingStats, stakingLoading])

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

    // Extract common calculation logic to a reusable function
    const calculateBoostValues = useCallback((userStakingAmount: number, totalStakingAmount: number) => {
        // Skip calculation if user has no stake
        if (userStakingAmount <= 0) return { netBoost: 1 };
        
        // Calculate KITE ratio
        const calculatedKiteRatio = 
            isNaN(totalStakingAmount) || totalStakingAmount === 0
                ? 0
                : userStakingAmount / totalStakingAmount;
                
        // Calculate haiVELO boost
        const haiVeloRatio = Number(userHaiVELODeposited) / Number(totalHaiVELODeposited);
        const haiVeloBoostRaw = haiVeloRatio === 0 ? 1 : calculatedKiteRatio / haiVeloRatio + 1;
        const haiVeloBoost = Math.min(haiVeloBoostRaw, 2);
        
        // Calculate LP boost
        const lpRatio = Number(totalPoolLiquidity) === 0 ? 0 : Number(userLPPosition) / Number(totalPoolLiquidity);
        const lpBoostRaw = lpRatio === 0 ? 1 : calculatedKiteRatio / lpRatio + 1;
        const lpBoost = Math.min(lpBoostRaw, 2);
        
        // Calculate weighted average boost
        const totalValue = Number(userLPPositionValue) + Number(haiVeloPositionValue);
        const haiVeloValueRatio = totalValue === 0 ? 0.5 : Number(haiVeloPositionValue) / totalValue;
        const lpValueRatio = totalValue === 0 ? 0.5 : Number(userLPPositionValue) / totalValue;
        
        const weightedHaiVeloBoost = haiVeloBoost * haiVeloValueRatio;
        const weightedLpBoost = lpBoost * lpValueRatio;
        
        const netBoost = weightedHaiVeloBoost + weightedLpBoost;
        
        return {
            kiteRatio: calculatedKiteRatio,
            haiVeloBoost,
            lpBoost,
            haiVeloValueRatio,
            lpValueRatio,
            netBoost
        };
    }, [userHaiVELODeposited, totalHaiVELODeposited, totalPoolLiquidity, userLPPosition, userLPPositionValue, haiVeloPositionValue]);
    
    // Calculate current boost values
    const currentBoostValues = useMemo(() => 
        calculateBoostValues(Number(userKITEStaked), Number(totalKITEStaked)),
    [calculateBoostValues, userKITEStaked, totalKITEStaked]);
    
    // Simplified simulation function that reuses the calculation logic
    const simulateNetBoost = useCallback((userAfterStakingAmount: number, totalAfterStakingAmount: number) => {
        return calculateBoostValues(userAfterStakingAmount, totalAfterStakingAmount).netBoost;
    }, [calculateBoostValues]);

    return {
        // HaiVELO data
        userHaiVELODeposited,
        totalHaiVELODeposited,
        haiVeloPositionValue,

        // KITE staking data
        userKITEStaked,
        totalKITEStaked,

        // LP Position data
        userLPPosition,
        totalPoolLiquidity,
        userLPPositionValue,

        // Boost data - take from calculated values
        hvBoost: currentBoostValues.haiVeloBoost,
        lpBoostValue: currentBoostValues.lpBoost,
        userTotalValue: Number(userLPPositionValue) + Number(haiVeloPositionValue),
        netBoostValue: currentBoostValues.netBoost,

        simulateNetBoost,

        // Loading state
        loading: lpDataLoading || positionsLoading || stakingLoading,
    }
}

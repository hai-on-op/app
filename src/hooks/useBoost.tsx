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

export function useBoost() {
    const { address } = useAccount()
    const { pool, userPositions, loading: lpDataLoading } = useLPData()
    const { data: veloPositions, loading: positionsLoading } = useVelodromePositions()
    const { prices: veloPrices } = useVelodromePrices()
    const { stakingData, stakingStats, loading: stakingLoading } = useStakingData()

    console.log('useBoost - stakingData:', stakingData)
    console.log('useBoost - stakingStats:', stakingStats)
    
    // Get token prices (ideally would come from a price oracle)
    // For now using token0Price and token1Price from the pool as approximate USD values
    // In a real implementation, you would need to convert to actual USD prices
    const token0UsdPrice = useMemo(() => {
        if (!pool || !pool.token0Price) return 0
        return parseFloat(pool.token0Price)
    }, [pool])
    
    const token1UsdPrice = useMemo(() => {
        if (!pool || !pool.token1Price) return 0
        return parseFloat(pool.token1Price)
    }, [pool])
    
    // Calculate total user LP position value using V3 formulas
    const calculatedUserLPPositionValue = useMemo(() => {
        if (!userPositions || !pool || userPositions.length === 0) return '0'
        
        // Calculate value for each position and sum them
        const totalValue = userPositions.reduce((sum, position) => {
            const positionValue = calculatePositionValue(
                position,
                pool,
                token0UsdPrice,
                token1UsdPrice
            )
            return sum + positionValue
        }, 0)
        
        return totalValue.toString()
    }, [userPositions, pool, token0UsdPrice, token1UsdPrice])
    
    // Calculate user's total liquidity (for boost calculation)
    const userTotalLiquidity = useMemo(() => {
        if (!userPositions || userPositions.length === 0) return '0'
        
        return userPositions.reduce((sum, position) => {
            return sum + Number(position.liquidity)
        }, 0).toString()
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
        if (!userTotalLiquidity || !pool?.liquidity || Number(pool.liquidity) === 0) return 1.0;
        if (!userKITEStaked || !totalKITEStaked || Number(totalKITEStaked) === 0 || Number(userKITEStaked) === 0) return 1.0;
        
        const lpRatio = Number(userTotalLiquidity) / Number(pool.liquidity);
        const kiteRatio = Number(userKITEStaked) / Number(totalKITEStaked);
        
        // Apply the formula
        const boost = (lpRatio / kiteRatio) + 1;
        
        // Capped at maximum of 2.5
        const cappedBoost = Math.min(boost, 2.5);
        
        console.log('HAI/WETH LP Boost calculation:', {
            lpRatio,
            kiteRatio,
            boost,
            cappedBoost
        });
        
        return cappedBoost;
    }, [userTotalLiquidity, pool?.liquidity, userKITEStaked, totalKITEStaked]);
    
    // Formatted values for display
    const formattedValues = useMemo(() => {
        return {
            // Format liquidity for display (shortened with K, M, B suffix)
            userLiquidity: formatNumberWithStyle(Number(userTotalLiquidity), {
                maxDecimals: 2,
                minDecimals: 0,
                suffixed: true
            }),
            
            totalLiquidity: formatNumberWithStyle(Number(pool?.liquidity || 0), {
                maxDecimals: 2,
                minDecimals: 0,
                suffixed: true
            }),
            
            // Format position value in USD with 3 decimals
            positionValue: formatNumberWithStyle(Number(calculatedUserLPPositionValue), {
                style: 'currency',
                maxDecimals: 3,
                minDecimals: 3
            }),
            
            // Format share as percentage with 4 decimals
            sharePercentage: formatNumberWithStyle(userSharePercentage, {
                maxDecimals: 4,
                minDecimals: 4
            }) + '%',
            
            // Format staking data
            userStaked: formatNumberWithStyle(Number(userKITEStaked), {
                maxDecimals: 2,
                minDecimals: 2
            }),
            
            totalStaked: formatNumberWithStyle(Number(totalKITEStaked), {
                maxDecimals: 0,
                minDecimals: 0,
                suffixed: true
            }),
            
            stakePercentage: formatNumberWithStyle(userStakePercentage, {
                maxDecimals: 4,
                minDecimals: 4
            }) + '%',
            
            // Format HAI/WETH LP boost
            haiWethLpBoost: formatNumberWithStyle(haiWethLpBoost, {
                maxDecimals: 3,
                minDecimals: 3
            }) + 'x'
        }
    }, [userTotalLiquidity, pool?.liquidity, calculatedUserLPPositionValue, userSharePercentage, userKITEStaked, totalKITEStaked, userStakePercentage, haiWethLpBoost])
    
    // Log formatted values
    console.log('Formatted LP Values:', formattedValues)
    console.log('HAI/WETH LP Boost:', haiWethLpBoost)
    console.log('HAI/WETH LP Value (USD):', calculatedUserLPPositionValue)
    
    // HaiVELO data (placeholder - would come from another subgraph)
    const userHaiVELODeposited = '0'
    const totalHaiVELODeposited = '0'
    
    // LP Position data
    const userLPPosition = userTotalLiquidity
    const totalPoolLiquidity = pool?.liquidity || '0'
    const userLPPositionValue = calculatedUserLPPositionValue
    
    // Boost calculations (placeholder implementation)
    // This would be calculated based on formula that considers KITE staked and LP positions
    const boostFactor = useMemo(() => {
        // Example formula: base 1.0 + (userKITEStaked / totalKITEStaked) * 0.5 + (userLPPosition / totalPoolLiquidity) * 0.5
        // Capped at 2.0
        
        const baseBoost = 1.0
        let kiteBoost = 0
        let lpBoost = 0
        
        // Calculate KITE staking boost component
        if (parseFloat(totalKITEStaked) > 0) {
            kiteBoost = (parseFloat(userKITEStaked) / parseFloat(totalKITEStaked)) * 0.5
        }
        
        // Calculate LP position boost component
        if (parseFloat(totalPoolLiquidity) > 0) {
            lpBoost = (parseFloat(userLPPosition) / parseFloat(totalPoolLiquidity)) * 0.5
        }
        
        // Calculate total boost, capped at 2.0
        const totalBoost = Math.min(baseBoost + kiteBoost + lpBoost, 2.0)
        
        return totalBoost.toFixed(2)
    }, [userKITEStaked, totalKITEStaked, userLPPosition, totalPoolLiquidity])
    
    const maxBoostFactor = '2.0'
    const boostProgress = (parseFloat(boostFactor) - 1.0) / (parseFloat(maxBoostFactor) - 1.0)
    
    // Boosted vaults count
    const boostedVaultsCount = 0
    
    return {
        // HaiVELO data
        userHaiVELODeposited,
        totalHaiVELODeposited,
        
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
        
        // Formatted values for display
        formattedValues,
        userSharePercentage,
        
        // Boost calculations
        boostFactor,
        maxBoostFactor,
        boostProgress,
        
        // Boosted vaults
        boostedVaultsCount,
        
        // Loading state
        loading: lpDataLoading || positionsLoading || stakingLoading,
    }
}

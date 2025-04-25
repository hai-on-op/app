import { useMemo, useCallback, useEffect } from 'react'
import { useStoreState, useStoreActions } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useAccount } from 'wagmi'
import { formatUnits } from 'ethers/lib/utils'
import { useLPData } from '~/providers/LPDataProvider'
import { useVelodromePositions } from './useVelodrome'
import { formatNumberWithStyle } from '~/utils'
import { useStakingData } from './useStakingData'
import { useHaiVeloData } from './useHaiVeloData'
import { useAnalytics } from '~/providers/AnalyticsProvider'

export function useBoost() {
    const { address } = useAccount()
    // Use LP data from our enhanced model
    const { 
        pool, 
        userPositions, 
        userLPPositionValue, 
        userTotalLiquidity, 
        loading: lpDataLoading 
    } = useLPData()
    const { data: veloPositions, loading: positionsLoading } = useVelodromePositions()
    const { prices: veloPrices } = useVelodromePrices()
    const { stakingData, stakingStats, loading: stakingLoading } = useStakingData()
    const { userHaiVELODeposited, totalHaiVELODeposited } = useHaiVeloData()

    const {
        haiMarketPrice,
        data: { tokenAnalyticsData },
    } = useAnalytics()

    // Get token price actions for updating the LP data model
    const { updateTokenPrices, calculateAllPositionValues, calculateAllUserLiquidity } = useStoreActions(
        (actions) => actions.lpDataModel
    )

    // Get HAI and WETH prices from analytics provider
    const haiPrice = useMemo(() => parseFloat(haiMarketPrice.raw || '0'), [haiMarketPrice])

    const wethPrice = useMemo(() => {
        // Find WETH in the token analytics data
        const wethData = tokenAnalyticsData.find((token) => token.symbol === 'WETH')
        // Convert from wei to ETH (18 decimals)
        return wethData ? parseFloat(formatUnits(wethData.currentPrice.toString(), 18)) : 0
    }, [tokenAnalyticsData])

    // Update token prices in the model when they change
    useEffect(() => {
        if (haiPrice && wethPrice) {
            updateTokenPrices({
                token0UsdPrice: haiPrice,
                token1UsdPrice: wethPrice
            })
            
            // Calculate position values for all users once prices are set
            calculateAllPositionValues()
            
            // Also calculate total liquidity (this doesn't need prices, but we can run it here)
            calculateAllUserLiquidity()
        }
    }, [haiPrice, wethPrice, updateTokenPrices, calculateAllPositionValues, calculateAllUserLiquidity])

    // KITE staking data
    const userKITEStaked = useMemo(() => {
        return stakingLoading ? '0' : stakingData.stakedBalance
    }, [stakingData, stakingLoading])

    const totalKITEStaked = useMemo(() => {
        return stakingLoading ? '0' : stakingStats.totalStaked
    }, [stakingStats, stakingLoading])

    // LP Position data - now using values from the model
    const userLPPosition = userTotalLiquidity
    const totalPoolLiquidity = pool?.liquidity || '0'
    const calculatedUserLPPositionValue = userLPPositionValue

    // Calculate haiVELO position value in USD using VELO price
    const haiVeloPositionValue = useMemo(() => {
        // Use the same price as VELO for haiVELO
        const veloPrice = parseFloat(veloPrices?.VELO?.raw || '0')
        const haiVeloAmount = parseFloat(userHaiVELODeposited || '0')

        return (haiVeloAmount * veloPrice).toString()
    }, [userHaiVELODeposited, veloPrices])

    // Extract common calculation logic to a reusable function
    const calculateBoostValues = useCallback(
        (userStakingAmount: number, totalStakingAmount: number) => {
            // Skip calculation if user has no stake
            if (userStakingAmount <= 0) return { netBoost: 1 }

            // Calculate KITE ratio
            const calculatedKiteRatio =
                isNaN(totalStakingAmount) || totalStakingAmount === 0 ? 0 : userStakingAmount / totalStakingAmount

            // Calculate haiVELO boost
            const haiVeloRatio = Number(userHaiVELODeposited) / Number(totalHaiVELODeposited)
            const haiVeloBoostRaw = haiVeloRatio === 0 ? 1 : calculatedKiteRatio / haiVeloRatio + 1
            const haiVeloBoost = Math.min(haiVeloBoostRaw, 2)

            // Calculate LP boost
            const lpRatio = Number(totalPoolLiquidity) === 0 ? 0 : Number(userLPPosition) / Number(totalPoolLiquidity)
            const lpBoostRaw = lpRatio === 0 ? 1 : calculatedKiteRatio / lpRatio + 1
            const lpBoost = Math.min(lpBoostRaw, 2)

            // Calculate weighted average boost
            const totalValue = Number(calculatedUserLPPositionValue) + Number(haiVeloPositionValue)
            const haiVeloValueRatio = totalValue === 0 ? 0.5 : Number(haiVeloPositionValue) / totalValue
            const lpValueRatio = totalValue === 0 ? 0.5 : Number(calculatedUserLPPositionValue) / totalValue

            const weightedHaiVeloBoost = haiVeloBoost * haiVeloValueRatio
            const weightedLpBoost = lpBoost * lpValueRatio

            const netBoost = weightedHaiVeloBoost + weightedLpBoost

            return {
                kiteRatio: calculatedKiteRatio,
                haiVeloBoost,
                lpBoost,
                haiVeloValueRatio,
                lpValueRatio,
                netBoost,
            }
        },
        [
            userHaiVELODeposited,
            totalHaiVELODeposited,
            totalPoolLiquidity,
            userLPPosition,
            calculatedUserLPPositionValue,
            haiVeloPositionValue,
        ]
    )

    // Calculate current boost values
    const currentBoostValues = useMemo(
        () => calculateBoostValues(Number(userKITEStaked), Number(totalKITEStaked)),
        [calculateBoostValues, userKITEStaked, totalKITEStaked]
    )

    // Simplified simulation function that reuses the calculation logic
    const simulateNetBoost = useCallback(
        (userAfterStakingAmount: number, totalAfterStakingAmount: number) => {
            return calculateBoostValues(userAfterStakingAmount, totalAfterStakingAmount).netBoost
        },
        [calculateBoostValues]
    )

    const totalDailyRewardsInUSD = 0.1
    const baseAPR = useMemo(() => {
        if (Number(haiVeloPositionValue) + Number(calculatedUserLPPositionValue) === 0) return 0
        return (totalDailyRewardsInUSD / (Number(haiVeloPositionValue) + Number(calculatedUserLPPositionValue))) * 365 * 100
    }, [totalDailyRewardsInUSD, haiVeloPositionValue, calculatedUserLPPositionValue])

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
        userLPPositionValue: calculatedUserLPPositionValue,

        // Boost data - take from calculated values
        hvBoost: currentBoostValues.haiVeloBoost,
        lpBoostValue: currentBoostValues.lpBoost,
        userTotalValue: Number(calculatedUserLPPositionValue) + Number(haiVeloPositionValue),
        netBoostValue: currentBoostValues.netBoost,

        simulateNetBoost,

        baseAPR,

        // Loading state
        loading: lpDataLoading || positionsLoading || stakingLoading,
    }
}

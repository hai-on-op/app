import { useMemo, useCallback, useEffect } from 'react'
import { useStoreState, useStoreActions } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useAccount } from 'wagmi'
import { formatUnits } from 'ethers/lib/utils'
import { useLPData } from '~/providers/LPDataProvider'
import { useVelodromePositions } from './useVelodrome'
import { formatNumberWithStyle } from '~/utils'
import { useStaking } from '~/providers/StakingProvider'
import { useHaiVeloData } from './useHaiVeloData'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import {
    calculateLPBoost,
    calculateHaiVeloBoost,
    combineBoostValues,
    simulateNetBoost as simulateNetBoostService,
    calculateBaseAPR,
} from '~/services/boostService'

export function useBoost() {
    const { address } = useAccount()
    // Use LP data from our enhanced model
    const { pool, userPositions, userLPPositionValue, userTotalLiquidity, loading: lpDataLoading } = useLPData()
    const { data: veloPositions, loading: positionsLoading } = useVelodromePositions()
    const { prices: veloPrices } = useVelodromePrices()
    const { stakingData, stakingStats, loading: stakingLoading } = useStaking()
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
                token1UsdPrice: wethPrice,
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

    // Calculate LP boost values
    const lpBoostResult = useMemo(
        () =>
            calculateLPBoost({
                userStakingAmount: Number(userKITEStaked),
                totalStakingAmount: Number(totalKITEStaked),
                userLPPosition,
                totalPoolLiquidity,
            }),
        [userKITEStaked, totalKITEStaked, userLPPosition, totalPoolLiquidity]
    )

    // Calculate haiVELO boost values
    const haiVeloBoostResult = useMemo(
        () =>
            calculateHaiVeloBoost({
                userStakingAmount: Number(userKITEStaked),
                totalStakingAmount: Number(totalKITEStaked),
                userHaiVELODeposited,
                totalHaiVELODeposited,
            }),
        [userKITEStaked, totalKITEStaked, userHaiVELODeposited, totalHaiVELODeposited]
    )

    // Combine the boost values
    const combinedBoostResult = useMemo(
        () =>
            combineBoostValues({
                lpBoost: lpBoostResult.lpBoost,
                haiVeloBoost: haiVeloBoostResult.haiVeloBoost,
                userLPPositionValue: calculatedUserLPPositionValue,
                haiVeloPositionValue,
            }),
        [lpBoostResult.lpBoost, haiVeloBoostResult.haiVeloBoost, calculatedUserLPPositionValue, haiVeloPositionValue]
    )

    // Reuse the simulation function from the service
    const simulateNetBoost = useCallback(
        (userAfterStakingAmount: number, totalAfterStakingAmount: number) => {
            return simulateNetBoostService({
                userAfterStakingAmount,
                totalAfterStakingAmount,
                userLPPosition,
                totalPoolLiquidity,
                userLPPositionValue: calculatedUserLPPositionValue,
                userHaiVELODeposited,
                totalHaiVELODeposited,
                haiVeloPositionValue,
            })
        },
        [
            userLPPosition,
            totalPoolLiquidity,
            calculatedUserLPPositionValue,
            userHaiVELODeposited,
            totalHaiVELODeposited,
            haiVeloPositionValue,
        ]
    )

    const totalDailyRewardsInUSD = 0.1
    const baseAPR = useMemo(
        () =>
            calculateBaseAPR({
                totalDailyRewardsInUSD,
                haiVeloPositionValue,
                userLPPositionValue: calculatedUserLPPositionValue,
            }),
        [totalDailyRewardsInUSD, haiVeloPositionValue, calculatedUserLPPositionValue]
    )

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

        // Boost data from the separated calculations
        kiteRatio: lpBoostResult.kiteRatio,
        hvBoost: haiVeloBoostResult.haiVeloBoost,
        lpBoostValue: lpBoostResult.lpBoost,
        userTotalValue: Number(calculatedUserLPPositionValue) + Number(haiVeloPositionValue),
        netBoostValue: combinedBoostResult.netBoost,

        simulateNetBoost,

        baseAPR,

        // Loading state
        loading: lpDataLoading || positionsLoading || stakingLoading,
    }
}

import { useMemo, useCallback, useEffect } from 'react'
import { useStoreActions } from '~/store'
// import { useVault } from '~/providers/VaultProvider'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useAccount } from 'wagmi'
import { formatUnits } from 'ethers/lib/utils'
import { useLPData } from '~/providers/LPDataProvider'
import { useVelodromePositions } from './useVelodrome'
// import { formatNumberWithStyle } from '~/utils'
import { useStaking } from '~/providers/StakingProvider'
import { useHaiVeloData } from './useHaiVeloData'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useQuery } from '@apollo/client'
import { SYSTEMSTATE_QUERY } from '~/utils/graphql/queries'
import { useBalance } from '~/hooks/useBalance'
import {
    calculateLPBoost,
    calculateHaiVeloBoost,
    calculateHaiHoldBoost,
    combineBoostValues,
    simulateNetBoost as simulateNetBoostService,
    calculateBaseAPR,
} from '~/services/boostService'

export function useBoost() {
    const { address } = useAccount()
    // Use LP data from our enhanced model
    const {
        pool,
        // userPositions,
        userLPPositionValue,
        userTotalLiquidity,
        loading: lpDataLoading,
        // NEW - Get boost data from LP data model
        userLPBoostMap,
        userKiteRatioMap,
        userPositionsMap,
    } = useLPData()
    const { loading: positionsLoading } = useVelodromePositions()
    const { prices: veloPrices } = useVelodromePrices()
    const stakingContext = useStaking()
    const { stakingData = { stakedBalance: '0' }, stakingStats = { totalStaked: '0' }, loading: stakingLoading = false } = stakingContext || {}
    const { userHaiVELODeposited, totalHaiVELODeposited } = useHaiVeloData()

    // Load system state data for HAI HOLD boost calculation
    const { data: systemStateData } = useQuery(SYSTEMSTATE_QUERY)

    // Get HAI balance for HAI HOLD boost calculation
    const haiBalance = useBalance('HAI')

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
    }, [
        haiPrice,
        wethPrice,
        updateTokenPrices,
        userPositionsMap,
        pool,
        calculateAllPositionValues,
        calculateAllUserLiquidity,
    ])

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

    // Get LP boost from the model if available, or calculate it using boostService
    const lpBoostValue = useMemo(() => {
        if (address && userLPBoostMap[address.toLowerCase()]) {
            return userLPBoostMap[address.toLowerCase()]
        }

        // Fallback to direct calculation if not available in the model
        // Use the exact boostService function for consistency
        const result = calculateLPBoost({
            userStakingAmount: Number(userKITEStaked),
            totalStakingAmount: Number(totalKITEStaked),
            userLPPosition,
            totalPoolLiquidity,
        })

        return result.lpBoost
    }, [address, userLPBoostMap, userKITEStaked, totalKITEStaked, userLPPosition, totalPoolLiquidity])

    // Get KITE ratio from the model if available, or calculate it
    const kiteRatio = useMemo(() => {
        if (address && userKiteRatioMap[address.toLowerCase()]) {
            return userKiteRatioMap[address.toLowerCase()]
        }

        // Fallback to same calculation as in boostService
        const totalStakingAmount = Number(totalKITEStaked)
        return isNaN(totalStakingAmount) || totalStakingAmount === 0 ? 0 : Number(userKITEStaked) / totalStakingAmount
    }, [address, userKiteRatioMap, userKITEStaked, totalKITEStaked])

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

    // Calculate HAI HOLD boost values
    const haiHoldBoostResult = useMemo(() => {
        const userHaiAmount = Number(haiBalance?.raw || 0)
        const totalHaiAmount = Number(systemStateData?.systemStates[0]?.erc20CoinTotalSupply || 0)
        
        const result = calculateHaiHoldBoost({
            userStakingAmount: Number(userKITEStaked),
            totalStakingAmount: Number(totalKITEStaked),
            userHaiAmount,
            totalHaiAmount,
        })
        
        return {
            haiHoldBoost: result.haiHoldBoost,
            haiHoldPositionValue: userHaiAmount * haiPrice,
        }
    }, [haiBalance, systemStateData, userKITEStaked, totalKITEStaked, haiPrice])

    // Combine the boost values
    const combinedBoostResult = useMemo(
        () =>
            combineBoostValues({
                haiVeloBoost: haiVeloBoostResult.haiVeloBoost,
                haiHoldBoost: haiHoldBoostResult.haiHoldBoost,
                haiVeloPositionValue,
                haiHoldPositionValue: haiHoldBoostResult.haiHoldPositionValue,
            }),
        [haiVeloBoostResult.haiVeloBoost, haiHoldBoostResult, haiVeloPositionValue]
    )

    // Reuse the simulation function from the service
    const simulateNetBoost = useCallback(
        (userAfterStakingAmount: number, totalAfterStakingAmount: number) => {
            const userHaiAmount = Number(haiBalance?.raw || 0)
            const totalHaiAmount = Number(systemStateData?.systemStates[0]?.erc20CoinTotalSupply || 0)
            
            return simulateNetBoostService({
                userAfterStakingAmount,
                totalAfterStakingAmount,
                userLPPosition,
                totalPoolLiquidity,
                userLPPositionValue: calculatedUserLPPositionValue,
                userHaiVELODeposited,
                totalHaiVELODeposited,
                haiVeloPositionValue,
                userHaiAmount,
                totalHaiAmount,
                haiHoldPositionValue: haiHoldBoostResult.haiHoldPositionValue,
            })
        },
        [
            userLPPosition,
            totalPoolLiquidity,
            calculatedUserLPPositionValue,
            userHaiVELODeposited,
            totalHaiVELODeposited,
            haiVeloPositionValue,
            haiBalance,
            systemStateData,
            haiHoldBoostResult.haiHoldPositionValue,
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

        // HAI HOLD data
        haiHoldBoost: haiHoldBoostResult.haiHoldBoost,
        haiHoldPositionValue: haiHoldBoostResult.haiHoldPositionValue,

        // Boost data from the LP data model
        kiteRatio,
        hvBoost: haiVeloBoostResult.haiVeloBoost,
        lpBoostValue,
        userTotalValue: Number(haiVeloPositionValue) + Number(haiHoldBoostResult.haiHoldPositionValue),
        netBoostValue: combinedBoostResult.netBoost,

        simulateNetBoost,

        baseAPR,

        // Loading state
        loading: lpDataLoading || positionsLoading || stakingLoading,
    }
}

import { useMemo, useCallback, useEffect } from 'react'
import { useStoreState } from '~/store'
// import { useVault } from '~/providers/VaultProvider'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useAccount } from 'wagmi'
import { formatUnits, formatEther } from 'ethers/lib/utils'
import { useLpPool } from './lp/useLpPool'
import { useLpUserTotalLiquidity } from './lp/useLpUserTotalLiquidity'
import { useLpUserPositionValue } from './lp/useLPUserPositionValue'
import { useLpUserPositionsMap } from './lp/useLpUserPositionsMap'
import { useLpBoostForUser } from './lp/useLpBoostForUser'
import { useVelodromePositions } from './useVelodrome'
// import { formatNumberWithStyle } from '~/utils'
// Replace legacy provider with react-query staking hooks
import { useStakeAccount } from '~/hooks/staking/useStakeAccount'
import { useStakeStats } from '~/hooks/staking/useStakeStats'
import { useHaiVeloData } from './useHaiVeloData'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useQuery } from '@apollo/client'
import { ALL_COLLATERAL_TYPES_QUERY } from '~/utils/graphql/queries'
import { useBalance } from '~/hooks/useBalance'
import { useMinterVaults } from '~/hooks/useMinterVaults'
import { REWARDS } from '~/utils/rewards'
import {
    calculateLPBoost,
    calculateHaiVeloBoost,
    calculateVaultBoost,
    combineBoostValues,
    simulateNetBoost as simulateNetBoostService,
    calculateBaseAPR,
} from '~/services/boostService'

export function useBoost() {
    const { address } = useAccount()
    const { data: pool } = useLpPool()
    const { value: userTotalLiquidity, loading: userTotalLiquidityLoading } = useLpUserTotalLiquidity(address as any)
    const { loading: userLPValueLoading, value: calculatedUserLPPositionValue } = useLpUserPositionValue(address as any)
    const { data: userPositionsMap } = useLpUserPositionsMap()
    const lpDataLoading = userTotalLiquidityLoading || userLPValueLoading
    const { lpBoost: lpBoostFromHook, kiteRatio: kiteRatioFromHook } = useLpBoostForUser(address as any)
    const { loading: positionsLoading } = useVelodromePositions()
    const { prices: veloPrices } = useVelodromePrices()
    const { data: stakingAccount, isLoading: stakingAccountLoading } = useStakeAccount(address as any)
    const { data: stakingStatsData, isLoading: stakingStatsLoading } = useStakeStats()
    const stakingLoading = stakingAccountLoading || stakingStatsLoading
    const { userHaiVELODeposited, totalHaiVELODeposited } = useHaiVeloData()

    // Load vault-specific data for vault boost calculation (similar to useEarnStrategies)
    const { data: minterVaultsData, loading: minterVaultsLoading } = useMinterVaults(address)
    const {
        data: collateralTypesData,
        loading: collateralTypesLoading,
    } = useQuery<{ collateralTypes: any[] }>(ALL_COLLATERAL_TYPES_QUERY)
    
    // Get staking data from store
    const {
        stakingModel: { usersStakingData, totalStaked },
        vaultModel: { list: userPositionsList },
    } = useStoreState((state) => state)

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

    // No store writes: pricing is consumed directly for calculations

    // KITE staking data
    const userKITEStaked = useMemo(() => {
        return stakingLoading ? '0' : (stakingAccount?.stakedBalance || '0')
    }, [stakingAccount, stakingLoading])

    const totalKITEStaked = useMemo(() => {
        return stakingLoading ? '0' : (stakingStatsData?.totalStaked || '0')
    }, [stakingStatsData, stakingLoading])

    // LP Position data from hooks
    const userLPPosition = userTotalLiquidity
    const totalPoolLiquidity = pool?.liquidity || '0'
    // calculatedUserLPPositionValue already provided by hook

    // Calculate haiVELO position value in USD using VELO price
    const haiVeloPositionValue = useMemo(() => {
        // Use the same price as VELO for haiVELO
        const veloPrice = parseFloat(veloPrices?.VELO?.raw || '0')
        const haiVeloAmount = parseFloat(userHaiVELODeposited || '0')

        return (haiVeloAmount * veloPrice).toString()
    }, [userHaiVELODeposited, veloPrices])

    // Get LP boost from the model if available, or calculate it using boostService
    const lpBoostValue = useMemo(() => lpBoostFromHook, [lpBoostFromHook])

    // Get KITE ratio from the model if available, or calculate it
    const kiteRatio = useMemo(() => kiteRatioFromHook, [kiteRatioFromHook])

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

    // Calculate vault boost values (replacing HAI minting boost)
    const vaultBoostResult = useMemo(() => {
        // Skip calculation if data is not available
        if (!minterVaultsData || !collateralTypesData?.collateralTypes || minterVaultsLoading || collateralTypesLoading) {
            return {
                vaultBoost: 1,
                vaultPositionValue: 0,
                totalVaultPosition: 0,
                userVaultPosition: 0,
                individualVaultBoosts: {},
                userVaultBoostMap: {},
            }
        }

        // Filter to collateral types with minter rewards (same logic as useEarnStrategies)
        const collateralsWithMinterRewards = collateralTypesData.collateralTypes.filter((cType) =>
            Object.values(REWARDS.vaults[cType.id as keyof typeof REWARDS.vaults] || {}).some((a) => a != 0)
        )

        let totalUserVaultMinted = 0
        let totalVaultMinted = 0
        let weightedBoostSum = 0
        let totalUserPositionValue = 0
        
        // Store individual vault boost data for useEarnStrategies
        const individualVaultBoosts: Record<string, any> = {}
        const userVaultBoostMap: Record<string, Record<string, number>> = {}

        // Calculate aggregated vault boost across all eligible collateral types
        collateralsWithMinterRewards.forEach((cType) => {
            const ctypeMinterData = minterVaultsData[cType.id]
            if (!ctypeMinterData) {
                // Store default values for missing data
                individualVaultBoosts[cType.id] = {
                    userVaultBoostMap: {},
                    cType: cType.id,
                    totalBoostedValueParticipating: 0,
                    baseAPR: 0,
                    myBoost: 1,
                    myValueParticipating: 0,
                    myBoostedValueParticipating: 0,
                    myBoostedShare: 0,
                    myBoostedAPR: 0,
                }
                return
            }

            // Calculate boost map for this collateral type (similar to calculateVaultBoostMap in useEarnStrategies)
            const vaultBoostMap = Object.entries(ctypeMinterData?.userDebtMapping || {}).reduce((acc, [userAddress, value]) => {
                const lowercasedAddress = userAddress.toLowerCase()
                if (!usersStakingData[lowercasedAddress]) {
                    return { ...acc, [lowercasedAddress]: 1 }
                } else {
                    const userStakingAmount = Number(usersStakingData[lowercasedAddress]?.stakedBalance)
                    const totalStakingAmount = Number(formatEther(totalStaked || '0'))
                    const userVaultMinted = Number(value)
                    const totalVaultMinted = Number(ctypeMinterData?.totalMinted)
                    const vaultBoost = calculateVaultBoost({
                        userStakingAmount,
                        totalStakingAmount,
                        userVaultMinted,
                        totalVaultMinted,
                    })

                    return {
                        ...acc,
                        [lowercasedAddress]: vaultBoost,
                    }
                }
            }, {} as Record<string, number>)

            userVaultBoostMap[cType.id] = vaultBoostMap

            // Calculate boost APR data for this collateral type (similar to calculateVaultBoostAPR in useEarnStrategies)
            const totalBoostedValueParticipating = Object.entries(ctypeMinterData?.userDebtMapping || {}).reduce(
                (acc, [userAddress, value]) => {
                    return acc + Number(value) * (vaultBoostMap[userAddress.toLowerCase()] || 1)
                },
                0
            )

            const rewards = REWARDS.vaults[cType.id as keyof typeof REWARDS.vaults] || REWARDS.default
            const dailyKiteReward = rewards.KITE || 0
            const kitePrice = Number(veloPrices?.KITE?.raw || 0)
            const dailyKiteRewardUsd = dailyKiteReward * kitePrice
            const baseAPR = totalBoostedValueParticipating
                ? (dailyKiteRewardUsd / totalBoostedValueParticipating) * 365 * 100
                : 0
            const myBoost = address ? vaultBoostMap[address.toLowerCase()] || 1 : 1
            const myValueParticipating = address ? Number(ctypeMinterData?.userDebtMapping[address.toLowerCase()] || 0) : 0
            const myBoostedValueParticipating = Number(myValueParticipating) * myBoost
            const myBoostedShare = totalBoostedValueParticipating
                ? myBoostedValueParticipating / totalBoostedValueParticipating
                : 0
            const myBoostedAPR = myBoost * baseAPR

            individualVaultBoosts[cType.id] = {
                userVaultBoostMap: vaultBoostMap,
                cType: cType.id,
                totalBoostedValueParticipating,
                baseAPR,
                myBoost,
                myValueParticipating,
                myBoostedValueParticipating,
                myBoostedShare,
                myBoostedAPR,
            }

            const userVaultMinted = address ? Number(ctypeMinterData.userDebtMapping[address.toLowerCase()] || 0) : 0
            const ctypeVaultMinted = Number(ctypeMinterData.totalMinted || 0)
            
            if (userVaultMinted > 0 && ctypeVaultMinted > 0) {
                // Calculate boost for this collateral type for aggregated calculation
                const userStakingAmount = Number(userKITEStaked)
                const totalStakingAmount = Number(formatEther(totalStaked || '0'))
                
                const vaultBoost = calculateVaultBoost({
                    userStakingAmount,
                    totalStakingAmount,
                    userVaultMinted,
                    totalVaultMinted: ctypeVaultMinted,
                })

                // Weight the boost by the user's position in this vault
                const userPositionValue = userVaultMinted * haiPrice
                weightedBoostSum += vaultBoost * userPositionValue
                totalUserPositionValue += userPositionValue
                
                totalUserVaultMinted += userVaultMinted
                totalVaultMinted += ctypeVaultMinted
            }
        })

        // Calculate weighted average boost
        const vaultBoost = totalUserPositionValue > 0 ? weightedBoostSum / totalUserPositionValue : 1
        
        return {
            vaultBoost,
            vaultPositionValue: totalUserPositionValue,
            totalVaultPosition: totalVaultMinted * haiPrice,
            userVaultPosition: totalUserVaultMinted,
            individualVaultBoosts,
            userVaultBoostMap,
        }
    }, [minterVaultsData, collateralTypesData, minterVaultsLoading, collateralTypesLoading, userKITEStaked, totalStaked, address, haiPrice, usersStakingData, veloPrices])

    // Combine the boost values
    const combinedBoostResult = useMemo(
        () =>
            combineBoostValues({
                haiVeloBoost: haiVeloBoostResult.haiVeloBoost,
                haiMintingBoost: vaultBoostResult.vaultBoost,
                haiVeloPositionValue,
                haiMintingPositionValue: vaultBoostResult.vaultPositionValue,
            }),
        [haiVeloBoostResult.haiVeloBoost, vaultBoostResult, haiVeloPositionValue]
    )

    // Reuse the simulation function from the service
    const simulateNetBoost = useCallback(
        (userAfterStakingAmount: number, totalAfterStakingAmount: number) => {
            // Calculate LP boost with simulated staking amounts
            const lpBoostResult = calculateLPBoost({
                userStakingAmount: userAfterStakingAmount,
                totalStakingAmount: totalAfterStakingAmount,
                userLPPosition,
                totalPoolLiquidity,
            })

            // Calculate haiVELO boost with simulated staking amounts
            const haiVeloBoostResult = calculateHaiVeloBoost({
                userStakingAmount: userAfterStakingAmount,
                totalStakingAmount: totalAfterStakingAmount,
                userHaiVELODeposited,
                totalHaiVELODeposited,
            })

            // Calculate vault boost with simulated staking amounts
            let simulatedVaultBoost = 1
            let totalUserVaultPositionValue = 0
            let weightedVaultBoostSum = 0

            // Simulate vault boost for each collateral type
            if (minterVaultsData && collateralTypesData?.collateralTypes) {
                const collateralsWithMinterRewards = collateralTypesData.collateralTypes.filter((cType) =>
                    Object.values(REWARDS.vaults[cType.id as keyof typeof REWARDS.vaults] || {}).some((a) => a != 0)
                )

                collateralsWithMinterRewards.forEach((cType) => {
                    const ctypeMinterData = minterVaultsData[cType.id]
                    if (!ctypeMinterData) return

                    const userVaultMinted = address ? Number(ctypeMinterData.userDebtMapping[address.toLowerCase()] || 0) : 0
                    const ctypeVaultMinted = Number(ctypeMinterData.totalMinted || 0)
                    
                    if (userVaultMinted > 0 && ctypeVaultMinted > 0) {
                        // Calculate simulated vault boost for this collateral type
                        const vaultBoost = calculateVaultBoost({
                            userStakingAmount: userAfterStakingAmount,
                            totalStakingAmount: totalAfterStakingAmount,
                            userVaultMinted,
                            totalVaultMinted: ctypeVaultMinted,
                        })

                        // Weight the boost by the user's position in this vault
                        const userPositionValue = userVaultMinted * haiPrice
                        weightedVaultBoostSum += vaultBoost * userPositionValue
                        totalUserVaultPositionValue += userPositionValue
                    }
                })

                // Calculate weighted average vault boost
                simulatedVaultBoost = totalUserVaultPositionValue > 0 ? weightedVaultBoostSum / totalUserVaultPositionValue : 1
            }

            // Combine the boost values
            const combinedResult = combineBoostValues({
                haiVeloBoost: haiVeloBoostResult.haiVeloBoost,
                haiMintingBoost: simulatedVaultBoost,
                haiVeloPositionValue,
                haiMintingPositionValue: totalUserVaultPositionValue,
            })

            return combinedResult.netBoost
        },
        [
            userLPPosition,
            totalPoolLiquidity,
            userHaiVELODeposited,
            totalHaiVELODeposited,
            haiVeloPositionValue,
            minterVaultsData,
            collateralTypesData,
            address,
            haiPrice,
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

        // Vault boost data (replacing HAI MINTING data)
        haiMintingBoost: vaultBoostResult.vaultBoost,
        haiMintingPositionValue: vaultBoostResult.vaultPositionValue,

        // Individual vault boost data for useEarnStrategies
        individualVaultBoosts: vaultBoostResult.individualVaultBoosts,
        userVaultBoostMap: vaultBoostResult.userVaultBoostMap,

        // Boost data from the LP data model
        kiteRatio,
        hvBoost: haiVeloBoostResult.haiVeloBoost,
        lpBoostValue,
        userTotalValue: Number(haiVeloPositionValue) + Number(vaultBoostResult.vaultPositionValue),
        netBoostValue: combinedBoostResult.netBoost,

        simulateNetBoost,

        baseAPR,

        // Loading state
        loading: lpDataLoading || positionsLoading || stakingLoading || minterVaultsLoading || collateralTypesLoading,
    }
}

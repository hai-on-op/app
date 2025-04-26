import { useMemo, useCallback } from 'react'
import { utils } from 'ethers'
import { formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'
import { useStakingData } from '~/hooks/useStakingData'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useBoost } from '~/hooks/useBoost'

export type StakingSummaryData = {
    // Loading state
    loading: boolean
    // Optimistic update indication
    isOptimistic: boolean

    // Price data
    kitePrice: number

    // Total staking data
    totalStaked: {
        amount: number
        amountFormatted: string
        usdValue: number
        usdValueFormatted: string
    }

    // User staking data
    myStaked: {
        amount: number
        amountFormatted: string
        usdValue: number
        usdValueFormatted: string
        effectiveAmount: number
        effectiveAmountFormatted: string
    }

    // Share and statistics
    myShare: {
        value: number
        percentage: string
    }

    // APR and rewards
    stakingApr: {
        value: number
        formatted: string
    }

    // Boost data
    boost: {
        netBoostValue: number
        netBoostFormatted: string
        boostedValue: number
        boostedValueFormatted: string
        haiVeloBoost: number
        lpBoost: number
        haiVeloPositionValue: number
        userLPPositionValue: number
    }

    // Raw data access
    stakingData: any

    // Simulation function
    simulateNetBoost: (userAfterStakingAmount: number, totalAfterStakingAmount: number) => number

    // Simulation helper
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

export function useStakingSummary(): StakingSummaryData {
    const {
        stakingData,
        stakingStats,
        loading: stakingLoading,
        stakingApyData,
        totalStaked,
        stakedBalance,
    } = useStakingData()
    const { prices: veloPrices } = useVelodromePrices()
    const isOptimistic = useStoreState((state) => state.stakingModel.isOptimistic)
    const optimisticData = useStoreState((state) => state.stakingModel.optimisticData)
    const {
        userHaiVELODeposited,
        totalHaiVELODeposited,
        userKITEStaked,
        totalKITEStaked,
        userLPPosition,
        totalPoolLiquidity,
        userLPPositionValue,
        lpBoostValue,
        userTotalValue,
        hvBoost,
        simulateNetBoost,
        netBoostValue,
        haiVeloPositionValue,
        loading: boostLoading,
    } = useBoost()

    const {
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)

    // Extract prices from various sources
    const haiPrice = parseFloat(liquidationData?.currentRedemptionPrice || '1')
    const kitePrice = Number(veloPrices?.KITE?.raw || 0)
    const opPrice = Number(liquidationData?.collateralLiquidationData?.OP?.currentPrice.value || 0)

    // Set up reward token addresses and prices
    const HAI_ADDRESS = import.meta.env.VITE_HAI_ADDRESS as string
    const KITE_ADDRESS = import.meta.env.VITE_KITE_ADDRESS as string
    const OP_ADDRESS = import.meta.env.VITE_OP_ADDRESS as string

    const rewardsDataMap: Record<string, number> = {
        [HAI_ADDRESS]: haiPrice,
        [KITE_ADDRESS]: kitePrice,
        [OP_ADDRESS]: opPrice,
    }

    // Calculate staking APR
    const stakingApyRewardsTotal = useMemo(() => {
        return stakingApyData.reduce(
            (acc, item) => {
                // Access price based on token address
                const price = rewardsDataMap[item.rpToken as string] || 0
                const scaledPrice = utils.parseUnits(price.toString(), 18)
                const amount = item.rpRate.mul(scaledPrice)
                const nextAcc = acc.add(amount)
                return nextAcc
            },
            utils.parseUnits('0', 18)
        )
    }, [stakingApyData, rewardsDataMap])

    // Calculate total staking APR
    const stakingApr = useMemo(() => {
        const totalStakedNumber = Number(stakingStats.totalStaked) || 0
        let aprValue = 0

        if (!isNaN(totalStakedNumber) && totalStakedNumber !== 0 && kitePrice !== 0) {
            const stakingApyRewardsTotalYearly = stakingApyRewardsTotal.mul(31536000)
            const scaledKitePrice = utils.parseUnits(kitePrice.toString(), 18)
            const scaledTotalStaked = utils.parseUnits(totalStakedNumber.toString(), 18)
            const scaledTotalStakedUSD = scaledTotalStaked.mul(scaledKitePrice)
            aprValue = Number(stakingApyRewardsTotalYearly.div(scaledTotalStakedUSD).toString())
        }

        return {
            value: aprValue,
            formatted: `${formatNumberWithStyle(aprValue, {
                minDecimals: 0,
                maxDecimals: 2,
            })}%`,
        }
    }, [stakingApyRewardsTotal, stakingStats.totalStaked, kitePrice])

    // Calculate effective staked balance (actual - pending withdrawals)
    const effectiveStakedBalance = useMemo(() => {
        // Ensure stakedBalance is treated as a string
        const balanceStr = typeof stakedBalance === 'string' ? stakedBalance : String(stakedBalance || '0')

        // Ensure pendingWithdrawal.amount is treated as a string
        const pendingAmount = stakingData.pendingWithdrawal
            ? Number(String(stakingData.pendingWithdrawal.amount || '0'))
            : 0

        return Number(balanceStr) - pendingAmount
    }, [stakedBalance, stakingData.pendingWithdrawal])

    // Function to calculate simulated values for staking/unstaking
    const calculateSimulatedValues = useCallback(
        (stakingAmount: string, unstakingAmount: string) => {
            const stakeAmountNum = Number(stakingAmount) || 0
            const unstakeAmountNum = Number(unstakingAmount) || 0
            const totalStakedValue = Number(totalStaked) / 10 ** 18
            const simulationMode = Boolean(
                (stakingAmount || unstakingAmount) && (stakeAmountNum > 0 || unstakeAmountNum > 0)
            )

            // Calculate simulated values
            const totalStakedAfterTx = totalStakedValue + stakeAmountNum - unstakeAmountNum
            const myStakedAfterTx = effectiveStakedBalance + stakeAmountNum - unstakeAmountNum
            const myShareAfterTx = totalStakedAfterTx !== 0 ? (myStakedAfterTx / totalStakedAfterTx) * 100 : 0

            // Calculate simulated boost
            const netBoostAfterTx = simulateNetBoost(myStakedAfterTx, totalStakedAfterTx)

            return {
                simulationMode,
                totalStakedAfterTx,
                myStakedAfterTx,
                myShareAfterTx,
                netBoostAfterTx,
            }
        },
        [effectiveStakedBalance, totalStaked, simulateNetBoost]
    )

    // Calculate base staking data
    const stakingSummary = useMemo(() => {
        const isLoading = stakingLoading || boostLoading

        if (isLoading) {
            return null
        }

        const totalStakedValue = Number(totalStaked) / 10 ** 18
        const totalStakedUSD = totalStakedValue * kitePrice
        const myStakedUSD = effectiveStakedBalance * kitePrice
        const myShare = totalStakedValue !== 0 ? (effectiveStakedBalance / totalStakedValue) * 100 : 0

        // Ensure numeric value for positions
        const numericHaiVeloPositionValue =
            typeof haiVeloPositionValue === 'string' ? Number(haiVeloPositionValue) : haiVeloPositionValue || 0

        const numericUserLPPositionValue =
            typeof userLPPositionValue === 'string' ? Number(userLPPositionValue) : userLPPositionValue || 0

        return {
            // Loading state
            loading: isLoading,
            // Optimistic update indication
            isOptimistic,

            // Price data
            kitePrice,

            // Total staking data
            totalStaked: {
                amount: totalStakedValue,
                amountFormatted: formatNumberWithStyle(totalStakedValue, {
                    minDecimals: 0,
                    maxDecimals: 2,
                }),
                usdValue: totalStakedUSD,
                usdValueFormatted: formatNumberWithStyle(totalStakedUSD, {
                    minDecimals: 0,
                    maxDecimals: 2,
                    style: 'currency',
                }),
            },

            // User staking data
            myStaked: {
                amount: Number(stakingData.stakedBalance),
                amountFormatted: formatNumberWithStyle(Number(stakingData.stakedBalance), {
                    minDecimals: 0,
                    maxDecimals: 2,
                }),
                effectiveAmount: effectiveStakedBalance,
                effectiveAmountFormatted: formatNumberWithStyle(effectiveStakedBalance, {
                    minDecimals: 0,
                    maxDecimals: 2,
                }),
                usdValue: myStakedUSD,
                usdValueFormatted: formatNumberWithStyle(myStakedUSD, {
                    minDecimals: 0,
                    maxDecimals: 2,
                    style: 'currency',
                }),
            },

            // Share and statistics
            myShare: {
                value: myShare,
                percentage: formatNumberWithStyle(myShare, {
                    minDecimals: 0,
                    maxDecimals: 2,
                    style: 'percent',
                    scalingFactor: 0.01,
                }),
            },

            // APR data
            stakingApr,

            // Boost data
            boost: {
                netBoostValue,
                netBoostFormatted:
                    formatNumberWithStyle(netBoostValue, {
                        minDecimals: 0,
                        maxDecimals: 2,
                    }) + 'x',
                boostedValue: userTotalValue,
                boostedValueFormatted: formatNumberWithStyle(userTotalValue, {
                    minDecimals: 0,
                    maxDecimals: 2,
                    style: 'currency',
                }),
                haiVeloBoost: hvBoost,
                lpBoost: lpBoostValue,
                haiVeloPositionValue: numericHaiVeloPositionValue,
                userLPPositionValue: numericUserLPPositionValue,
            },

            // Raw data access
            stakingData,
        }
    }, [
        stakingLoading,
        boostLoading,
        totalStaked,
        stakingData,
        kitePrice,
        effectiveStakedBalance,
        stakingApr,
        netBoostValue,
        userTotalValue,
        hvBoost,
        lpBoostValue,
        haiVeloPositionValue,
        userLPPositionValue,
        isOptimistic,
    ])

    // Default values when loading or data is not available
    const defaultSummary: StakingSummaryData = {
        loading: true,
        isOptimistic: false,
        kitePrice: 0,
        totalStaked: {
            amount: 0,
            amountFormatted: '0',
            usdValue: 0,
            usdValueFormatted: '$0',
        },
        myStaked: {
            amount: 0,
            amountFormatted: '0',
            effectiveAmount: 0,
            effectiveAmountFormatted: '0',
            usdValue: 0,
            usdValueFormatted: '$0',
        },
        myShare: {
            value: 0,
            percentage: '0%',
        },
        stakingApr: {
            value: 0,
            formatted: '0%',
        },
        boost: {
            netBoostValue: 1,
            netBoostFormatted: '1x',
            boostedValue: 0,
            boostedValueFormatted: '$0',
            haiVeloBoost: 0,
            lpBoost: 0,
            haiVeloPositionValue: 0,
            userLPPositionValue: 0,
        },
        stakingData: {},
        simulateNetBoost,
        calculateSimulatedValues,
    }

    // Return all necessary data and functions
    return stakingSummary
        ? {
              ...stakingSummary,
              stakingData,
              simulateNetBoost,
              calculateSimulatedValues,
          }
        : defaultSummary
}

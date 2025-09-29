import { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { formatEther, formatUnits } from 'ethers/lib/utils'
import type { SortableHeader, Sorting } from '~/types'

import { arrayToSorted, stringsExistAndAreEqual, tokenAssets, type QueryCollateralType } from '~/utils'
import { RewardsModel } from '~/model/rewardsModel'
import { calculateHaiMintingBoost } from '~/services/boostService'
import type { BoostAPRData } from '~/types/system'
import { calculateTokenPrice, calculatePoolTVL, getTokenSymbol } from '~/utils/priceCalculations'
import { VELODROME_POOLS, VELO_POOLS } from '~/utils/constants'
import { normalizeAPRValue, getEffectiveAPR, getBestAPRValue } from '~/utils/aprNormalization'
import { createVaultStrategy, createSpecialStrategy, createVeloStrategy } from '~/utils/strategyFactory'
import { useEarnData } from './useEarnData'
import { useBoost } from './useBoost'
import { shouldHaltExecution, canContinueWithDegradedMode } from '~/utils/errorHandling'
import { useClaims } from '~/providers/ClaimsProvider'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useStoreState } from '~/store'
import { utils } from 'ethers'
import { useUnderlyingAPR } from '~/hooks/useUnderlyingAPR'

// Import the BaseStrategy type for state management
type BaseStrategy = ReturnType<typeof createVaultStrategy>

const sortableHeaders: SortableHeader[] = [
    { label: 'Asset / Asset Pair' },
    { label: 'Strategy' },
    {
        label: 'TVP',
        tooltip: `Value participating in campaign`,
    },
    {
        label: 'Position',
        tooltip: `Your value participating in the campaign`,
    },
    {
        label: 'Boost',
        tooltip: `Amount of boost you will receive based on your participation and staked kite`,
    },
    {
        label: 'APR',
        tooltip: `Variable based upon participation and value of campaign emissions`,
    },
]

export function useEarnStrategies() {
    const { address } = useAccount()

    // === Load All Data ===
    const {
        // Raw data
        systemStateData,
        minterVaultsData,
        collateralTypesData,
        myVaultsData,
        velodromeData,
        velodromePositionsData,
        velodromePricesData,
        haiVeloSafesData,
        strategyData,
        // Store state data
        tokensData,
        userPositionsList,
        usersStakingData,
        totalStaked,
        stakingApyData,
        // Loading/error states
        loading,
        allDataLoaded,
        stakingDataLoaded,
        storeDataLoaded,
        error: dataLoadingError,
        hasErrors,
    } = useEarnData()

    // === Get vault boost data from useBoost ===
    const { individualVaultBoosts, loading: boostLoading } = useBoost()

    // === Get incentives data for rewards calculation ===
    const { incentivesData } = useClaims()
    const { prices: veloPrices } = useVelodromePrices()
    const {
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)

    // Ensure haiVELO deposit strategy APR matches underlying APR
    const { underlyingAPR: haiVeloUnderlyingAPR } = useUnderlyingAPR({ collateralType: 'HAIVELOV2' })

    // Get token prices for rewards calculation
    const getTokenPrice = (token: string): number => {
        switch (token) {
            case 'KITE':
                return Number(veloPrices?.KITE?.raw || 0)
            case 'OP':
                return Number(liquidationData?.collateralLiquidationData?.OP?.currentPrice.value || 0)
            case 'DINERO':
                return Number(veloPrices?.DINERO?.raw || 0)
            case 'HAI':
                return Number(liquidationData?.currentRedemptionPrice || 1)
            default:
                return 0
        }
    }

    // === State ===
    const [vaultStrategies, setVaultStrategies] = useState<BaseStrategy[]>([])
    const [specialStrategies, setSpecialStrategies] = useState<BaseStrategy[]>([])
    const [veloStrategies, setVeloStrategies] = useState<BaseStrategy[]>([])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'TVP',
        dir: 'desc',
    })

    const [filterEmpty, setFilterEmpty] = useState(false)

    useEffect(() => {
        // Error boundary: halt execution if critical errors exist
        if (dataLoadingError && shouldHaltExecution(dataLoadingError)) {
            console.error('Critical error detected, halting strategy calculation:', dataLoadingError)
            return
        }

        // Proceed with calculation if data is loaded or if we can continue with degraded mode
        // Proceed earlier: require core data (allDataLoaded) but do not block on user-specific extras
        const canProceed =
            (allDataLoaded && storeDataLoaded && !boostLoading) ||
            (dataLoadingError && canContinueWithDegradedMode(dataLoadingError))

        if (canProceed) {
            try {
                const vaultStrats = calculateVaultStrategies()
                const specialStrats = calculateSpecialStrategies()
                const veloStrats = calculateVeloStrategies()
                setVaultStrategies(vaultStrats)
                setSpecialStrategies(specialStrats)
                setVeloStrategies(veloStrats)
            } catch (calculationError) {
                console.error('Error calculating strategies:', calculationError)
                // Reset to empty arrays on calculation failure
                setVaultStrategies([])
                setSpecialStrategies([])
                setVeloStrategies([])
            }
        }
    }, [
        allDataLoaded,
        stakingDataLoaded,
        storeDataLoaded,
        boostLoading,
        dataLoadingError,
        userPositionsList,
        systemStateData,
        haiVeloSafesData,
        address,
        stakingApyData,
        individualVaultBoosts,
    ])

    // === Calculate Strategies ===

    const calculateVaultStrategies = (): BaseStrategy[] => {
        // Safe fallback if data is missing
        if (!collateralTypesData?.collateralTypes || !velodromePricesData?.HAI) {
            return []
        }

        const collateralsWithMinterRewards = collateralTypesData.collateralTypes.filter((cType) =>
            Object.values(RewardsModel.getVaultRewards(cType.id) || {}).some((a) => a != 0)
        )

        if (!collateralsWithMinterRewards.length) return []

        const haiPrice = Number(velodromePricesData?.HAI.raw)

        const strategies = collateralsWithMinterRewards.map((cType) => {
            const assets = tokenAssets[cType.id]

            const cTypeUserPosition = userPositionsList.reduce((total: number, { totalDebt, collateralName }: any) => {
                if (collateralName.toLowerCase() !== cType.id.toLowerCase()) return total
                return total + parseFloat(totalDebt)
            }, 0)

            const rewards = RewardsModel.getVaultRewards(cType.id) || {}
            // Use vault boost data from useBoost instead of calculating it here
            const vbr = individualVaultBoosts[cType.id] || {
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

            return createVaultStrategy({
                pair: [assets?.symbol || 'HAI'],
                collateral: cType.id,
                rewards: Object.entries(rewards).map(([token, emission]) => ({ token, emission })),
                tvl: parseFloat(cType.debtAmount) * haiPrice,
                boostAPR: vbr,
                userPosition: cTypeUserPosition * haiPrice,
            })
        })

        return strategies
    }

    const calculateSpecialStrategies = (): BaseStrategy[] => {
        // Safe fallback if strategy data is missing
        if (!strategyData) {
            return []
        }

        const haiApr = strategyData.hai?.apr || 0
        const haiTvl = strategyData.hai?.tvl || 0
        const haiUserPosition = strategyData.hai?.userPosition || 0

        const haiVeloTvl = strategyData.haiVelo?.tvl || 0
        const haiVeloUserPositionUsd = strategyData.haiVelo?.userPosition || 0
        const haiVeloBoostApr = strategyData.haiVelo?.boostApr

        const kiteApr = strategyData.kiteStaking?.apr || 0
        const kiteTvl = strategyData.kiteStaking?.tvl || 0
        const kiteUserPosition = strategyData.kiteStaking?.userPosition || 0

        // Calculate HAI MINTING boost using the same logic as staking page
        const userHaiMinted = Number(haiUserPosition) / Number(velodromePricesData?.HAI?.raw || 1)
        const totalHaiMinted = Number(systemStateData?.systemStates[0]?.erc20CoinTotalSupply || 0)
        const userStakingAmount = address ? Number(usersStakingData[address.toLowerCase()]?.stakedBalance || 0) : 0
        const totalStakingAmount = Number(formatEther(totalStaked || '0'))

        const haiMintingBoostResult = calculateHaiMintingBoost({
            userStakingAmount,
            totalStakingAmount,
            userHaiMinted,
            totalHaiMinted,
        })

        const haiMintingBoost = {
            baseAPR: haiApr * 100,
            myBoost: haiMintingBoostResult.haiMintingBoost,
            myBoostedAPR: haiApr * 100 * haiMintingBoostResult.haiMintingBoost,
        }

        return [
            createSpecialStrategy({
                pair: ['HAI'],
                tvl: haiTvl,
                apr: haiApr,
                userPosition: haiUserPosition,
                strategyType: 'hold',
                boostEligible: false,
            }),
            createSpecialStrategy({
                pair: ['HAIVELO'],
                tvl: haiVeloTvl,
                apr: haiVeloUnderlyingAPR || 0,
                userPosition: haiVeloUserPositionUsd,
                strategyType: 'deposit',
                boostAPR: haiVeloBoostApr as BoostAPRData,
                boostEligible: true,
            }),
            createSpecialStrategy({
                pair: ['KITE'],
                tvl: kiteTvl,
                apr: kiteApr,
                userPosition: kiteUserPosition,
                strategyType: 'stake',
                earnLink: '/stake',
            }),
        ]
    }

    const calculateVeloStrategies = (): BaseStrategy[] => {
        // Safe fallback if required data is missing
        if (!velodromePricesData || !velodromeData || !tokensData) {
            return []
        }

        const strategies: BaseStrategy[] = []
        for (const pool of velodromeData) {
            if (!VELO_POOLS.includes(pool.address)) continue

            // Get token symbols using utility function
            const token0 = getTokenSymbol(pool.token0, tokensData, pool.tokenPair[0])
            const token1 = getTokenSymbol(pool.token1, tokensData, pool.tokenPair[1])

            // Get token prices using utility function
            const price0 = calculateTokenPrice(token0, velodromePricesData as any)
            const price1 = calculateTokenPrice(token1, velodromePricesData as any)

            // Calculate pool TVL using utility function
            const { totalTvl: tvl } = calculatePoolTVL(pool, tokensData, velodromePricesData as any)
            const veloAPR =
                (365 *
                    parseFloat(formatUnits(pool.emissions, pool.decimals)) *
                    Number(velodromePricesData.VELO.raw) *
                    86400) /
                tvl
            const userPosition = (velodromePositionsData || []).reduce((total: number, position: any) => {
                if (!stringsExistAndAreEqual(position.lp, pool.address)) return total
                return (
                    total +
                    parseFloat(formatUnits(position.staked0, pool.decimals)) * price0 +
                    parseFloat(formatUnits(position.staked1, pool.decimals)) * price1
                )
            }, 0)

            const rewardsObj = RewardsModel.getPoolRewards(pool.address) || {}
            const rewardsArray = Object.entries(rewardsObj).map(([token, emission]) => ({ token, emission }))
            const strategy = createVeloStrategy({
                pair: [token0, token1],
                rewards: rewardsArray,
                tvl: tvl,
                apr: veloAPR || 0,
                userPosition,
                earnAddress: pool.address,
                earnLink: `https://velodrome.finance/deposit?token0=${pool.token0}&token1=${pool.token1}&type=${pool.type}`,
            })
            strategies.push(strategy)
        }
        return strategies
    }

    // === Calculate Strategy Utils ===
    // Note: calculateVaultBoostAPR and calculateVaultBoostMap functions have been removed
    // as they are now handled by useBoost hook

    const strategies = [...vaultStrategies, ...specialStrategies, ...veloStrategies]

    const filteredRows = useMemo(() => {
        if (!filterEmpty) return strategies

        // Filter to only show strategies where user has a position
        return strategies.filter((strategy) => {
            const userPosition = Number(strategy.userPosition)
            return userPosition > 0
        })
    }, [strategies, filterEmpty])

    const boostEligibleStrategies = strategies.filter(({ boostEligible }: any) => boostEligible)

    const totalPosition = boostEligibleStrategies.reduce((acc, { userPosition }: any) => {
        return acc + Number(userPosition)
    }, 0)

    const effectiveStrategiesAPR = strategies.map((strategy) => getEffectiveAPR(strategy))

    const averageWeightedAPR = strategies.reduce((acc, strategy, i) => {
        const strategyAPR = effectiveStrategiesAPR[i]
        return acc + (Number(strategy.userPosition) / totalPosition) * (strategyAPR ? strategyAPR.apr : 0)
    }, 0)

    const averageWeightedBoostedAPR = strategies.reduce((acc, strategy, i) => {
        const strategyAPR = effectiveStrategiesAPR[i]
        return acc + (Number(strategy.userPosition) / totalPosition) * (strategyAPR ? strategyAPR.boostedApr : 0)
    }, 0)

    const averageWeightedBoost = boostEligibleStrategies.reduce((acc, strategy) => {
        const strategyBoost = strategy.boostAPR?.myBoost || 1 // Default to 1x if no boost
        const userPosition = Number(strategy.userPosition)
        return acc + (userPosition / totalPosition) * strategyBoost
    }, 0)

    // Calculate total rewards value from user's positions
    const totalRewardsValue = useMemo(() => {
        if (!incentivesData?.claimData) return 0

        let totalValue = 0

        // Calculate rewards from incentives data (same as ClaimModal)
        const incentiveTokens = ['KITE', 'OP', 'DINERO', 'HAI'] as const

        incentiveTokens.forEach((token) => {
            const data = incentivesData.claimData[token]
            const price = getTokenPrice(token)

            if (data?.hasClaimableDistros && data?.amount) {
                const amount = parseFloat(utils.formatEther(data.amount))
                totalValue += amount * price
            }
        })

        return totalValue
    }, [incentivesData?.claimData])

    // Get unique reward tokens from incentives data
    const rewardTokens = useMemo(() => {
        if (!incentivesData?.claimData) return []

        const tokens: string[] = []
        const incentiveTokens = ['KITE', 'OP', 'DINERO', 'HAI'] as const

        incentiveTokens.forEach((token) => {
            const data = incentivesData.claimData[token]
            if (data?.hasClaimableDistros && data?.amount) {
                tokens.push(token)
            }
        })
        return tokens
    }, [incentivesData?.claimData])

    const sortedRows = useMemo(() => {
        if (!allDataLoaded) return []

        switch (sorting.key) {
            case 'Asset / Asset Pair':
                return arrayToSorted(filteredRows, {
                    getProperty: (row: any) => row.pair[0],
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'Strategy':
                return arrayToSorted(filteredRows, {
                    getProperty: (row: any) => row.strategyType,
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'TVP':
                return arrayToSorted(filteredRows, {
                    getProperty: (row: any) => row.tvl,
                    dir: sorting.dir,
                    type: 'parseFloat',
                    checkValueExists: true,
                })
            case 'Position':
                return arrayToSorted(filteredRows, {
                    getProperty: (row: any) => row.userPosition,
                    dir: sorting.dir,
                    type: 'parseFloat',
                    checkValueExists: true,
                })
            case 'Boost':
                return arrayToSorted(filteredRows, {
                    getProperty: (row: any) => row.boostAPR?.myBoost || 1,
                    dir: sorting.dir,
                    type: 'numerical',
                })
            case 'APR':
                return arrayToSorted(filteredRows, {
                    getProperty: (row: any) => {
                        const aprValue = getBestAPRValue(row)
                        return normalizeAPRValue(aprValue, row.strategyType)
                    },
                    dir: sorting.dir,
                    type: 'numerical',
                })
            default:
                return arrayToSorted(filteredRows, {
                    getProperty: (row: any) => row.tvl,
                    dir: sorting.dir,
                    type: 'parseFloat',
                    checkValueExists: true,
                })
        }
    }, [filteredRows, sorting, allDataLoaded])

    return {
        rawData: {
            minterVaultsData,
            collateralTypesData,
            myVaultsData,
            velodromeData,
            velodromePositionsData,
            velodromePricesData,
            usersStakingData,
            totalStaked,
        },
        headers: sortableHeaders,
        averageAPR: {
            averageWeightedAPR,
            averageWeightedBoostedAPR,
        },
        averageWeightedBoost,
        totalBoostablePosition: totalPosition,
        totalRewardsValue,
        rewardTokens,
        rows: sortedRows,
        rowsUnmodified: strategies,
        loading: !allDataLoaded || boostLoading,
        error: dataLoadingError,
        hasErrors,
        uniError: null,
        veloError: null,
        sorting,
        setSorting,
        filterEmpty,
        setFilterEmpty,
    }
}

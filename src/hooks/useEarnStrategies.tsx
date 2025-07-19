import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMinterVaults } from './useMinterVaults'
import { useAccount } from 'wagmi'
import { ALL_COLLATERAL_TYPES_QUERY, SYSTEMSTATE_QUERY, ALL_SAFES_QUERY } from '~/utils/graphql/queries'
import { ApolloError, useQuery, gql } from '@apollo/client'
import { formatEther, formatUnits } from 'ethers/lib/utils'
import type { SortableHeader, Sorting } from '~/types'

import { arrayToSorted, stringsExistAndAreEqual, tokenAssets, type QueryCollateralType } from '~/utils'
import { useStoreState } from '~/store'
import { useMyVaults, useBalance } from '~/hooks'
import { useVelodrome, useVelodromePositions } from './useVelodrome'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { REWARDS } from '~/utils/rewards'
import { calculateVaultBoost, calculateHaiMintingBoost } from '~/services/boostService'
import { useStrategyData } from './useStrategyData'
import { calculateTokenPrice, calculatePoolTVL, getTokenSymbol } from '~/utils/priceCalculations'
import { VELODROME_POOLS, VELO_POOLS } from '~/utils/constants'
import { normalizeAPRValue, getEffectiveAPR, getBestAPRValue } from '~/utils/aprNormalization'
import { createVaultStrategy, createSpecialStrategy, createVeloStrategy } from '~/utils/strategyFactory'

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

    // ===State===

    const {
        connectWalletModel: { tokensFetchedData, tokensData },
        vaultModel: { list: userPositionsList },
        stakingModel: { usersStakingData, totalStaked, stakingApyData },
    } = useStoreState((state) => state)

    const storeDataLoaded = usersStakingData && userPositionsList && tokensFetchedData

    const [vaultStrategies, setVaultStrategies] = useState<any[]>([])
    const [specialStrategies, setSpecialStrategies] = useState<any[]>([])
    const [veloStrategies, setVeloStrategies] = useState<any[]>([])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'TVP',
        dir: 'desc',
    })

    const [filterEmpty, setFilterEmpty] = useState(false)

    // === Load All Data ===

    // 1. Load system state data
    const { data: systemStateData, loading: systemStateLoading, error: systemStateError } = useQuery(SYSTEMSTATE_QUERY)

    // 2. Load minter vaults data for collaterals with minting rewards
    const { data: minterVaultsData, loading: minterVaultsLoading, error: minterVaultsError } = useMinterVaults(address)

    // 3. Load collateral types data
    const {
        data: collateralTypesData,
        loading: collateralTypesLoading,
        error: collateralTypesError,
    } = useQuery<{ collateralTypes: QueryCollateralType[] }>(ALL_COLLATERAL_TYPES_QUERY)

    // 4. Load user vaults data
    const myVaultsData = useMyVaults()

    // 5. Load velodrome data
    const { data: velodromeData, loading: velodromeLoading, error: velodromeError } = useVelodrome()

    // 6. Load velodrome positions data
    const {
        data: velodromePositionsData,
        loading: velodromePositionsLoading,
        error: velodromePositionsError,
    } = useVelodromePositions()

    // 7. Load velodrome prices
    const {
        prices: velodromePricesData,
        loading: velodromePricesLoading,
        error: velodromePricesError,
    } = useVelodromePrices()

    // 8. Load hai velo safes data
    const {
        data: haiVeloSafesData,
        loading: haiVeloSafesLoading,
        error: haiVeloSafesError,
    } = useQuery<any>(ALL_SAFES_QUERY, {
        variables: {
            collateralTypeId: 'HAIVELO',
        },
    })

    // 9. Load strategy specific data (hold hai, deposit haiVelo)
    const strategyData = useStrategyData(
        systemStateData,
        userPositionsList,
        velodromePricesData,
        usersStakingData,
        haiVeloSafesData,
        address,
        stakingApyData
    )

    const stakingDataLoaded = Object.keys(usersStakingData).length > 0 && Number(totalStaked) > 0

    const dataLoadingError =
        minterVaultsError ||
        collateralTypesError ||
        velodromeError ||
        velodromePositionsError ||
        velodromePricesError ||
        systemStateError ||
        haiVeloSafesError

    const allDataLoaded =
        !minterVaultsLoading &&
        !collateralTypesLoading &&
        !velodromeLoading &&
        !velodromePositionsLoading &&
        !velodromePricesLoading &&
        !systemStateLoading &&
        !haiVeloSafesLoading

    useEffect(() => {
        if (allDataLoaded && stakingDataLoaded && storeDataLoaded) {
            const vaultStrats = calculateVaultStrategies()
            const specialStrats = calculateSpecialStrategies()
            const veloStrats = calculateVeloStrategies()
            setVaultStrategies(vaultStrats as any)
            setSpecialStrategies(specialStrats as any)
            setVeloStrategies(veloStrats as any)
        }
    }, [
        allDataLoaded,
        stakingDataLoaded,
        storeDataLoaded,
        userPositionsList,
        systemStateData,
        haiVeloSafesData,
        address,
        stakingApyData,
    ])

    // === Calculate Strategies ===

    const calculateVaultStrategies = () => {
        const collateralsWithMinterRewards = collateralTypesData?.collateralTypes.filter((cType) =>
            Object.values(REWARDS.vaults[cType.id as keyof typeof REWARDS.vaults] || {}).some((a) => a != 0)
        )

        if (!collateralsWithMinterRewards) return []

        const haiPrice = Number(velodromePricesData?.HAI.raw)

        const strategies = collateralsWithMinterRewards.map((cType) => {
            const assets = tokenAssets[cType.id]

            const cTypeUserPosition = userPositionsList.reduce((total, { totalDebt, collateralName }) => {
                if (collateralName.toLowerCase() !== cType.id.toLowerCase()) return total
                return total + parseFloat(totalDebt)
            }, 0)

            const rewards = REWARDS.vaults[cType.id as keyof typeof REWARDS.vaults] || REWARDS.default
            const vbr = calculateVaultBoostAPR(cType, rewards)

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

    const calculateSpecialStrategies = () => {
        const haiApr = strategyData?.hai?.apr || 0
        const haiTvl = strategyData?.hai?.tvl || 0
        const haiUserPosition = strategyData?.hai?.userPosition || 0

        const haiVeloTvl = strategyData?.haiVelo?.tvl || 0
        const haiVeloUserPositionUsd = strategyData?.haiVelo?.userPosition || 0
        const haiVeloBoostApr = strategyData?.haiVelo?.boostApr

        const kiteApr = strategyData?.kiteStaking?.apr || 0
        const kiteTvl = strategyData?.kiteStaking?.tvl || 0
        const kiteUserPosition = strategyData?.kiteStaking?.userPosition || 0

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
                apr: haiVeloBoostApr?.baseAPR / 100 || 0,
                userPosition: haiVeloUserPositionUsd,
                strategyType: 'deposit',
                boostAPR: haiVeloBoostApr,
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

    const calculateVeloStrategies = () => {
        if (!velodromePricesData || !velodromeData) return []
        const strategies: any[] = []
        for (const pool of velodromeData) {
            if (!VELO_POOLS.includes(pool.address)) continue
            
            // Get token symbols using utility function
            const token0 = getTokenSymbol(pool.token0, tokensData, pool.tokenPair[0])
            const token1 = getTokenSymbol(pool.token1, tokensData, pool.tokenPair[1])
            
            // Get token prices using utility function
            const price0 = calculateTokenPrice(token0, velodromePricesData as any)
            const price1 = calculateTokenPrice(token1, velodromePricesData as any)
            
            // Calculate pool TVL using utility function
            const { tvl0, tvl1, totalTvl: tvl } = calculatePoolTVL(pool, tokensData, velodromePricesData as any)
            const veloAPR =
                (365 *
                    parseFloat(formatUnits(pool.emissions, pool.decimals)) *
                    Number(velodromePricesData.VELO.raw) *
                    86400) /
                tvl
            const userPosition = (velodromePositionsData || []).reduce((total, position) => {
                if (!stringsExistAndAreEqual(position.lp, pool.address)) return total
                return (
                    total +
                    parseFloat(formatUnits(position.staked0, pool.decimals)) * price0 +
                    parseFloat(formatUnits(position.staked1, pool.decimals)) * price1
                )
            }, 0)

            const strategy = createVeloStrategy({
                pair: [token0, token1],
                rewards: REWARDS.velodrome[pool.address.toLowerCase()],
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

    const calculateVaultBoostAPR = (cType: QueryCollateralType, rewards: any) => {
        const ctypeMinterData = minterVaultsData[cType.id]

        if (!ctypeMinterData) {
            return {
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
        }

        const userVaultBoostMap = calculateVaultBoostMap(ctypeMinterData)

        const totalBoostedValueParticipating = Object.entries(ctypeMinterData?.userDebtMapping || {}).reduce(
            (acc, [address, value]) => {
                return acc + Number(value) * (userVaultBoostMap[address.toLowerCase()] || 1)
            },
            0
        )

        const dailyKiteReward = rewards.KITE || 0
        const kitePrice = Number(velodromePricesData?.KITE.raw)
        const dailyKiteRewardUsd = dailyKiteReward * (kitePrice || 0)
        const baseAPR = totalBoostedValueParticipating
            ? (dailyKiteRewardUsd / totalBoostedValueParticipating) * 365 * 100
            : 0
        const myBoost = address ? userVaultBoostMap[address.toLowerCase()] || 1 : 1
        const myValueParticipating = address ? ctypeMinterData?.userDebtMapping[address.toLowerCase()] || 0 : 0
        const myBoostedValueParticipating = Number(myValueParticipating) * myBoost
        const myBoostedShare = totalBoostedValueParticipating
            ? myBoostedValueParticipating / totalBoostedValueParticipating
            : 0
        const myBoostedAPR = myBoost * baseAPR

        return {
            userVaultBoostMap,
            cType: cType.id,
            totalBoostedValueParticipating,
            baseAPR,
            myBoost,
            myValueParticipating,
            myBoostedValueParticipating,
            myBoostedShare,
            myBoostedAPR,
        }
    }

    const calculateVaultBoostMap = (ctypeMinterData: any) => {
        if (!ctypeMinterData) {
            return {}
        }

        return Object.entries(ctypeMinterData?.userDebtMapping || {}).reduce((acc, [address, value]) => {
            const lowercasedAddress = address.toLowerCase()
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
        }, {} as any)
    }

    const calculateHaiVeloBoostAPR = () => {}

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
        rows: sortedRows,
        rowsUnmodified: strategies,
        loading: !allDataLoaded,
        error: collateralTypesError,
        uniError: null,
        veloError: null,
        sorting,
        setSorting,
        filterEmpty,
        setFilterEmpty,
    }
}

import { useMemo, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import type { SortableHeader, Sorting } from '~/types'
import type { BoostAPRData } from '~/types/system'

import { arrayToSorted } from '~/utils'
import { normalizeAPRValue, getEffectiveAPR, getBestAPRValue } from '~/utils/aprNormalization'
import { useClaims } from '~/providers/ClaimsProvider'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useStoreState } from '~/store'
import { utils } from 'ethers'
import { useApr } from '~/apr/AprProvider'
import type { StrategyAprResult, BoostData } from '~/apr/types'

/**
 * Convert AprProvider's BoostData (decimal APR) to the legacy BoostAPRData (percentage APR)
 * used by the Earn page components.
 */
function toBoostAPRData(boost: BoostData): BoostAPRData {
    return {
        totalBoostedValueParticipating: boost.totalBoostedValueParticipating,
        baseAPR: boost.baseApr * 100,
        myBoost: boost.myBoost,
        myValueParticipating: boost.myValueParticipating,
        myBoostedValueParticipating: boost.myBoostedValueParticipating,
        myBoostedShare: boost.myBoostedShare,
        myBoostedAPR: boost.boostedApr * 100,
    }
}

// Strategy shape expected by Earn page components
interface BaseStrategy {
    pair: string[]
    tvl: number | string
    apr: number | string
    userPosition: number | string
    strategyType: 'borrow' | 'hold' | 'deposit' | 'stake' | 'farm'
    rewards?: Array<{ token: string; emission: number }>
    boostAPR?: BoostAPRData
    boostEligible?: boolean
    collateral?: string
    earnPlatform?: 'uniswap' | 'velodrome'
    earnAddress?: string
    earnLink?: string
    /** Net APR for vault strategies (underlying yield + incentives - stability fee) */
    netApr?: number
    /** Underlying collateral yield */
    underlyingApr?: number
    /** Stability fee (positive decimal) */
    stabilityFee?: number
}

/** Map from AprProvider strategy ID to earn link */
const EARN_LINKS: Record<string, string> = {
    'kite-staking': '/stake',
    'haibold-curve-lp': '/stake/hai-bold-curve-lp',
    'haivelo-velo-lp': '/stake/hai-velo-velo-lp',
}

/** Convert a StrategyAprResult from AprProvider to legacy BaseStrategy */
function toBaseStrategy(s: StrategyAprResult): BaseStrategy {
    const base: BaseStrategy = {
        pair: s.pair,
        tvl: s.tvl,
        apr: s.type === 'borrow' ? '0' : s.baseApr, // vault strategies show apr=0, APR is in boostAPR
        userPosition: s.userPosition,
        strategyType: s.type,
        rewards: s.rewards,
    }

    if (s.boost) {
        base.boostAPR = toBoostAPRData(s.boost)
        base.boostEligible = true
    }

    if (s.id.startsWith('vault-')) {
        base.collateral = s.id.replace('vault-', '')
        base.netApr = s.netApr
        base.underlyingApr = s.underlyingApr
        base.stabilityFee = s.stabilityFee
    }

    if (s.id.startsWith('velo-')) {
        const poolAddress = s.id.replace('velo-', '')
        base.earnPlatform = 'velodrome'
        base.earnAddress = poolAddress
        base.earnLink = `https://velodrome.finance/deposit?token0=&token1=&type=`
    }

    const earnLink = EARN_LINKS[s.id]
    if (earnLink) {
        base.earnLink = earnLink
    }

    return base
}

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
    const { strategies: aprStrategies, loading: aprLoading } = useApr()

    // === Get incentives data for rewards calculation ===
    const { incentivesData } = useClaims()
    const { prices: veloPrices } = useVelodromePrices()
    const {
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)

    // Get token prices for rewards calculation
    const getTokenPrice = useCallback(
        (token: string): number => {
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
        },
        [veloPrices, liquidationData]
    )

    const [sorting, setSorting] = useState<Sorting>({
        key: 'TVP',
        dir: 'desc',
    })

    const [filterEmpty, setFilterEmpty] = useState(false)

    // === Convert AprProvider strategies to legacy BaseStrategy shape ===
    const strategies: BaseStrategy[] = useMemo(() => {
        return Object.values(aprStrategies).map(toBaseStrategy)
    }, [aprStrategies])

    const filteredRows = useMemo(() => {
        if (!filterEmpty) return strategies

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
        const strategyBoost = strategy.boostAPR?.myBoost || 1
        const userPosition = Number(strategy.userPosition)
        return acc + (userPosition / totalPosition) * strategyBoost
    }, 0)

    // Calculate total rewards value from user's positions
    const totalRewardsValue = useMemo(() => {
        if (!incentivesData?.claimData) return 0

        let totalValue = 0
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
    }, [incentivesData, getTokenPrice])

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
        if (aprLoading) return []

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
    }, [filteredRows, sorting, aprLoading])

    return {
        rawData: {
            minterVaultsData: undefined,
            collateralTypesData: undefined,
            myVaultsData: undefined,
            velodromeData: undefined,
            velodromePositionsData: undefined,
            velodromePricesData: undefined,
            usersStakingData: {},
            totalStaked: '0',
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
        loading: aprLoading,
        error: null,
        hasErrors: false,
        uniError: null,
        veloError: null,
        sorting,
        setSorting,
        filterEmpty,
        setFilterEmpty,
    }
}

import { useMemo, useState } from 'react'
import { formatUnits } from 'ethers/lib/utils'
import { useQuery } from '@apollo/client'
import { useAccount } from 'wagmi'

import type { SortableHeader, Sorting, Strategy } from '~/types'
import {
    ALL_COLLATERAL_TYPES_QUERY,
    OPTIMISM_UNISWAP_POOL_QUERY,
    OPTIMISM_UNISWAP_POOL_WITH_POSITION_QUERY,
    REWARDS,
    type QueryCollateralType,
    arrayToSorted,
    tokenAssets,
    QueryLiquidityPoolWithPositions,
    uniClient,
    stringsExistAndAreEqual,
} from '~/utils'
import { useStoreState } from '~/store'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useVelodrome, useVelodromePositions } from './useVelodrome'
import { useBalance } from '~/hooks'
import { useAnalytics } from '~/providers/AnalyticsProvider'

const sortableHeaders: SortableHeader[] = [
    { label: 'Asset / Asset Pair' },
    { label: 'Strategy' },
    {
        label: 'TVP',
        tooltip: `Value participating in campaign`,
    },
    {
        label: 'My Position',
        tooltip: `Your value participating in the campaign`,
    },
    {
        label: 'Rewards APY',
        tooltip: `Variable based upon participation and value of campaign emissions`,
    },
]

export function useEarnStrategies() {
    const {
        connectWalletModel: { tokensData },
        vaultModel: { list, liquidationData },
    } = useStoreState((state) => state)

    const { address } = useAccount()
    const { prices: veloPrices } = useVelodromePrices()

    const { data, loading, error } = useQuery<{ collateralTypes: QueryCollateralType[] }>(ALL_COLLATERAL_TYPES_QUERY)
    const {
        data: uniData,
        loading: uniLoading,
        error: uniError,
    } = useQuery<{ liquidityPools: QueryLiquidityPoolWithPositions[] }>(
        address ? OPTIMISM_UNISWAP_POOL_WITH_POSITION_QUERY : OPTIMISM_UNISWAP_POOL_QUERY,
        {
            client: uniClient,
            variables: {
                ids: Object.keys(REWARDS.uniswap),
                address,
            },
        }
    )
    const { data: veloData, loading: veloLoading, error: veloError } = useVelodrome()
    const { data: veloPositions } = useVelodromePositions()

    const prices = useMemo(() => {
        return {
            HAI: parseFloat(liquidationData?.currentRedemptionPrice || '0'),
            KITE: parseFloat(veloPrices?.KITE.raw || '0'),
            VELO: parseFloat(veloPrices?.VELO.raw || '0'),
            OP: parseFloat(liquidationData?.collateralLiquidationData['OP']?.currentPrice.value || '0'),
            WETH: parseFloat(liquidationData?.collateralLiquidationData['WETH']?.currentPrice.value || '0'),
        }
    }, [liquidationData?.currentRedemptionPrice, liquidationData?.collateralLiquidationData, veloPrices])

    const vaultStrategies = useMemo(() => {
        return (
            data?.collateralTypes
                .filter((cType) =>
                    Object.values(REWARDS.vaults[cType.id as keyof typeof REWARDS.vaults] || {}).some((a) => a != 0)
                )
                .map((cType) => {
                    const { symbol } =
                        tokenAssets[cType.id] ||
                        Object.values(tokenAssets).find(({ name }) => name.toLowerCase() === cType.id.toLowerCase()) ||
                        {}
                    const rewards = REWARDS.vaults[symbol as keyof typeof REWARDS.vaults] || REWARDS.default
                    const apy = calculateAPY(parseFloat(cType.debtAmount) * prices.HAI, prices, rewards)
                    return {
                        pair: [symbol || 'HAI'],
                        rewards: Object.entries(rewards).map(([token, emission]) => ({ token, emission })),
                        tvl: cType.debtAmount,
                        strategyType: 'borrow',
                        apy,
                        userPosition: list
                            .reduce((total, { totalDebt, collateralName }) => {
                                if (collateralName !== symbol) return total
                                return total + parseFloat(totalDebt)
                            }, 0)
                            .toString(),
                    } as Strategy
                }) || []
        )
    }, [data?.collateralTypes, prices, list, tokenAssets])

    const uniStrategies = useMemo(() => {
        if (!uniData?.liquidityPools.length) return []
        const temp: Strategy[] = []
        for (const pool of uniData.liquidityPools) {
            const rewards = REWARDS.uniswap[pool.id.toLowerCase()]
            if (!rewards) continue // sanity check

            const tvl =
                parseFloat(formatUnits(pool.inputTokenBalances[0], 18)) * prices.HAI +
                parseFloat(formatUnits(pool.inputTokenBalances[1], 18)) * prices.WETH
            const apy = calculateAPY(tvl, prices, rewards)
            temp.push({
                pair: pool.inputTokens.map((token) => token.symbol) as any,
                rewards: Object.entries(rewards).map(([token, emission]) => ({ token, emission })) as any,
                tvl: tvl.toString(),
                apy,
                userPosition: (pool.positions || [])
                    .reduce((total, { cumulativeDepositTokenAmounts, cumulativeWithdrawTokenAmounts }) => {
                        const posHai =
                            parseFloat(formatUnits(cumulativeDepositTokenAmounts[0], 18)) -
                            parseFloat(formatUnits(cumulativeWithdrawTokenAmounts[0], 18))
                        const posETH =
                            parseFloat(formatUnits(cumulativeDepositTokenAmounts[1], 18)) -
                            parseFloat(formatUnits(cumulativeWithdrawTokenAmounts[1], 18))
                        return total + (posHai * prices.HAI + posETH * prices.WETH)
                    }, 0)
                    .toString(),
                earnPlatform: 'uniswap',
                earnAddress: pool.id,
                strategyType: 'farm',
                earnLink: `https://info.uniswap.org/#/optimism/pools/${pool.id}`,
            } as Strategy)
        }
        return temp
    }, [uniData?.liquidityPools, prices])

    const veloStrategies = useMemo(() => {
        if (!veloPrices || !veloData) return []
        const temp: Strategy[] = []
        // Filter out SAIL
        for (const pool of veloData.filter((p) => p.address != '0xB5cD4bD4bdB5C97020FBE192258e6F08333990E2')) {
            const rewards = REWARDS.velodrome[pool.address.toLowerCase()]
            if (!rewards) continue // filter out any extra pools that may be fetched

            // daily_rewards = Lp. emissions * velo price * 86400
            // tv1 =(Lp. reserve * token0 _price) + (Lp.reservel * token1 _price)
            // staked_tvl = tvl * (Lp. gauge_total_supply / Lp.total_supply)
            // apr = (daily_rewards / staked_tv1) * 365
            const token0 =
                Object.values(tokensData).find(({ address }) => stringsExistAndAreEqual(address, pool.token0))
                    ?.symbol || pool.tokenPair[0]
            const price0 = parseFloat((veloPrices as any)[token0]?.raw || (prices as any)[token0]?.toString() || '1')
            const tvl0 = parseFloat(formatUnits(pool.staked0, pool.decimals)) * price0

            const token1 =
                Object.values(tokensData).find(({ address }) => stringsExistAndAreEqual(address, pool.token1))
                    ?.symbol || pool.tokenPair[1]
            const price1 = parseFloat((veloPrices as any)[token1]?.raw || (prices as any)[token1]?.toString() || '1')
            const tvl1 = parseFloat(formatUnits(pool.staked1, pool.decimals)) * price1

            const tvl = tvl0 + tvl1
            const veloAPR = (365 * parseFloat(formatUnits(pool.emissions, pool.decimals)) * prices.VELO * 86400) / tvl
            const apy = veloAPR === Infinity ? 0 : Math.pow(1 + veloAPR / 12, 12) - 1

            temp.push({
                pair: [token0, token1] as any,
                rewards: Object.entries(rewards).map(([token, emission]) => ({ token, emission })) as any,
                tvl: tvl.toString(),
                apy,
                userPosition: (veloPositions || [])
                    .reduce((total, position) => {
                        if (!stringsExistAndAreEqual(position.lp, pool.address)) return total
                        return (
                            total +
                            parseFloat(formatUnits(position.staked0, pool.decimals)) * price0 +
                            parseFloat(formatUnits(position.staked1, pool.decimals)) * price1
                        )
                    }, 0)
                    .toString(),
                earnPlatform: 'velodrome',
                earnAddress: pool.address,
                earnLink: `https://velodrome.finance/deposit?token0=${pool.token0}&token1=${pool.token1}&type=${pool.type}`,
                strategyType: 'farm',
            })
        }
        return temp
    }, [veloData, veloPrices, veloPositions, prices, tokensData])

    const haiBalance = useBalance('HAI')
    const analytics = useAnalytics()
    const {
        data: { erc20Supply, annualRate },
    } = analytics
    const rRateApr = Number(annualRate.raw)
    const rRateApy = Math.pow(1 + rRateApr / 365, 365) - 1

    const specialStrategies = [
        {
            pair: ['HAI'],
            rewards: [],
            tvl: erc20Supply.raw,
            apy: rRateApy,
            userPosition: haiBalance?.raw,
            strategyType: 'hold',
        },
    ]

    const strategies = useMemo(() => {
        return [...specialStrategies, ...vaultStrategies, ...uniStrategies, ...veloStrategies]
    }, [specialStrategies, vaultStrategies, uniStrategies, veloStrategies])

    const [filterEmpty, setFilterEmpty] = useState(false)

    const filteredRows = useMemo(() => {
        if (!filterEmpty) return strategies

        return strategies.filter(({ userPosition }) => !!userPosition && userPosition !== '0')
    }, [strategies, filterEmpty])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'My Position',
        dir: 'desc',
    })

    const sortedRows = useMemo(() => {
        switch (sorting.key) {
            case 'Asset / Asset Pair':
                return arrayToSorted(filteredRows, {
                    getProperty: (row) => row.pair[0],
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'Strategy':
                return arrayToSorted(filteredRows, {
                    getProperty: (row) => row.strategyType,
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'TVP':
                return arrayToSorted(filteredRows, {
                    getProperty: (row) => row.tvl,
                    dir: sorting.dir,
                    type: 'parseFloat',
                    checkValueExists: true,
                })
            case 'Rewards APY':
                return arrayToSorted(filteredRows, {
                    getProperty: (row) => row.apy,
                    dir: sorting.dir,
                    type: 'numerical',
                })
            case 'My Position':
            default:
                return arrayToSorted(filteredRows, {
                    getProperty: (row) => row.userPosition,
                    dir: sorting.dir,
                    type: 'parseFloat',
                    checkValueExists: true,
                })
        }
    }, [filteredRows, sorting])

    return {
        headers: sortableHeaders,
        rows: sortedRows,
        rowsUnmodified: strategies,
        loading: loading || uniLoading || veloLoading,
        error: error?.message,
        uniError: uniError?.message,
        veloError,
        sorting,
        setSorting,
        filterEmpty,
        setFilterEmpty,
    }
}

const calculateAPY = (
    tvl: number,
    prices: { KITE: number; OP: number },
    rewards: { KITE: number; OP: number } = REWARDS.default
) => {
    if (!tvl) return 0
    if (!prices.KITE || !prices.OP) return 0

    // ((kite-daily-emission * kite-price + op-daily-emission * op-price) * 365) / (hai-debt-per-collateral * hai-redemption-price)
    const nominal = (365 * (rewards.KITE * prices.KITE + rewards.OP * prices.OP)) / tvl
    return nominal === Infinity ? 0 : Math.pow(1 + nominal / 12, 12) - 1
}

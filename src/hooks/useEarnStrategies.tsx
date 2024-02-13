import { useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'

import type { SortableHeader, Sorting, Strategy } from '~/types'
import { ALL_COLLATERAL_TYPES_QUERY, type QueryCollateralType, arrayToSorted, tokenAssets } from '~/utils'
import { useStoreState } from '~/store'

const sortableHeaders: SortableHeader[] = [
    { label: 'Asset / Asset Pair' },
    { label: 'Strategy' },
    {
        label: 'TVL',
        tooltip: `Value participating in campaign`,
    },
    {
        label: 'Rewards APY',
        tooltip: `Variable based upon participation and value of campaign emissions`,
    },
    {
        label: 'My Position',
        tooltip: `Your value participating in the campaign`,
    },
]

// TODO: calculate velodrome and uniswap pool values based on Kingfish doc
const dummyRows: Strategy[] = [
    {
        pair: ['WETH', 'HAI'],
        rewards: ['OP', 'KITE'],
        tvl: '5600000',
        vol24hr: '4600000',
        apy: 0.19,
        userPosition: '300000',
        userApy: 0.15,
        earnPlatform: 'uniswap',
    },
    {
        pair: ['WBTC', 'HAI'],
        rewards: ['OP', 'KITE'],
        tvl: '5500000',
        vol24hr: '5100000',
        apy: 0.11,
        earnPlatform: 'velodrome',
    },
    {
        pair: ['KITE', 'OP'],
        rewards: ['OP', 'KITE'],
        tvl: '4600000',
        vol24hr: '1200000',
        apy: 0.09,
        userPosition: '169000',
        userApy: 0.11,
        earnPlatform: 'velodrome',
    },
]

export function useEarnStrategies() {
    const {
        vaultModel: { list },
    } = useStoreState((state) => state)

    const { data } = useQuery<{ collateralTypes: QueryCollateralType[] }>(ALL_COLLATERAL_TYPES_QUERY)

    const collateralStrategies: Strategy[] = useMemo(() => {
        if (!data?.collateralTypes) return []

        return data.collateralTypes
            .map((cType) => {
                const { symbol } =
                    tokenAssets[cType.id] ||
                    Object.values(tokenAssets).find(({ name }) => name.toLowerCase() === cType.id.toLowerCase()) ||
                    {}
                // ((kite-daily-emission * kite-price + op-daily-emission * op-price) * 365) / (hai-debt-per-collateral * hai-redemption-price)
                // TODO: plug in actual values
                const nominal = ((12 * 10 + 25 * 3.85) * 365) / (parseFloat(cType.debtAmount) * 1.05)
                const apy = nominal === Infinity ? 0 : Math.pow(1 + nominal / 12, 12) - 1
                return {
                    pair: [symbol || 'HAI'],
                    rewards: ['OP', 'KITE'],
                    tvl: cType.debtAmount,
                    vol24hr: '',
                    apy,
                    userPosition: list
                        .reduce((total, { totalDebt, collateralName }) => {
                            if (collateralName !== symbol) return total
                            return total + parseFloat(totalDebt)
                        }, 0)
                        .toString(),
                    userApy: apy,
                } as Strategy
            })
            .concat(dummyRows)
    }, [data?.collateralTypes, list])

    const [filterEmpty, setFilterEmpty] = useState(false)

    const filteredRows = useMemo(() => {
        if (!filterEmpty) return collateralStrategies

        return collateralStrategies.filter(({ userPosition }) => !!userPosition)
    }, [collateralStrategies, filterEmpty])

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
                    getProperty: (row) => (row.earnPlatform ? 'farm' : 'borrow'),
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'TVL':
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
        rowsUnmodified: collateralStrategies,
        sorting,
        setSorting,
        filterEmpty,
        setFilterEmpty,
    }
}

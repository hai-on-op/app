import { useMemo, useState } from 'react'

import type { SortableHeader, Sorting, Strategy } from '~/types'
import { arrayToSorted } from '~/utils'

const sortableHeaders: SortableHeader[] = [
    { label: 'Asset Pair' },
    { label: 'Strategy' },
    { label: 'TVL' },
    // { label: 'Vol. 24hr' },
    { label: 'Rewards APY' },
    { label: 'My Position' },
    // { label: 'My APY' },
]

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
    {
        pair: ['WETH'],
        rewards: ['OP', 'KITE'],
        tvl: '4600000',
        vol24hr: '1200000',
        apy: 0.09,
        userPosition: '169000',
        userApy: 0.11,
    },
    {
        pair: ['OP'],
        rewards: ['OP', 'KITE'],
        tvl: '4600000',
        vol24hr: '1200000',
        apy: 0.09,
        userPosition: '169000',
        userApy: 0.11,
    },
    {
        pair: ['WBTC'],
        rewards: ['OP', 'KITE'],
        tvl: '4600000',
        vol24hr: '1200000',
        apy: 0.09,
        userPosition: '169000',
        userApy: 0.11,
    },
    {
        pair: ['WSTETH'],
        rewards: ['OP', 'KITE'],
        tvl: '4600000',
        vol24hr: '1200000',
        apy: 0.09,
        userPosition: '169000',
        userApy: 0.11,
    },
]

export function useEarnStrategies() {
    const [filterEmpty, setFilterEmpty] = useState(false)

    const [rows] = useState(() =>
        dummyRows.map((obj) => ({
            ...obj,
            tvl: Math.random() < 0.25 ? '' : ((2 + 8 * Math.random()) * 1_000_000).toFixed(0),
            vol24hr: Math.random() < 0.25 ? undefined : ((1 + 10 * Math.random()) * 100_000).toFixed(0),
            apy: 0.01 + 0.2 * Math.random(),
            userPosition: Math.random() < 0.25 ? '' : ((1 + 9 * Math.random()) * 100_000).toFixed(0),
            userApy: 0.01 + 0.2 * Math.random(),
        }))
    )

    const filteredRows = useMemo(() => {
        if (!filterEmpty) return rows

        return rows.filter(({ userPosition }) => !!userPosition)
    }, [rows, filterEmpty])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'My Position',
        dir: 'desc',
    })

    const sortedRows = useMemo(() => {
        switch (sorting.key) {
            case 'Asset Pair':
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
            // case 'Vol. 24hr':
            //     return arrayToSorted(filteredRows, {
            //         getProperty: row => row.vol24hr,
            //         dir: sorting.dir,
            //         type: 'parseFloat',
            //         checkValueExists: true,
            //     })
            case 'Rewards APY':
                return arrayToSorted(filteredRows, {
                    getProperty: (row) => row.apy,
                    dir: sorting.dir,
                    type: 'numerical',
                })
            // case 'My APY':
            //     return arrayToSorted(filteredRows, {
            //         getProperty: row => row.userApy,
            //         dir: sorting.dir,
            //         type: 'numerical',
            //         checkValueExists: true,
            //     })
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
        rowsUnmodified: dummyRows,
        sorting,
        setSorting,
        filterEmpty,
        setFilterEmpty,
    }
}

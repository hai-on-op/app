import { useMemo, useState } from 'react'

import type { SortableHeader, Sorting, Strategy } from '~/types'

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
        tvl: '$5.6M',
        vol24hr: '$4.6M',
        apy: 0.19,
        userPosition: '$300k',
        userApy: 0.15,
        earnPlatform: 'uniswap',
    },
    {
        pair: ['WBTC', 'HAI'],
        rewards: ['OP', 'KITE'],
        tvl: '$5.5M',
        vol24hr: '$5.1M',
        apy: 0.11,
        earnPlatform: 'velodrome',
    },
    {
        pair: ['KITE', 'OP'],
        rewards: ['OP', 'KITE'],
        tvl: '$4.6M',
        vol24hr: '$1.2M',
        apy: 0.09,
        userPosition: '$169k',
        userApy: 0.11,
        earnPlatform: 'velodrome',
    },
    {
        pair: ['WETH'],
        rewards: ['OP', 'KITE'],
        tvl: '$4.6M',
        vol24hr: '$1.2M',
        apy: 0.09,
        userPosition: '$169k',
        userApy: 0.11,
    },
    {
        pair: ['OP'],
        rewards: ['OP', 'KITE'],
        tvl: '$4.6M',
        vol24hr: '$1.2M',
        apy: 0.09,
        userPosition: '$169k',
        userApy: 0.11,
    },
    {
        pair: ['WBTC'],
        rewards: ['OP', 'KITE'],
        tvl: '$4.6M',
        vol24hr: '$1.2M',
        apy: 0.09,
        userPosition: '$169k',
        userApy: 0.11,
    },
    {
        pair: ['WSTETH'],
        rewards: ['OP', 'KITE'],
        tvl: '$4.6M',
        vol24hr: '$1.2M',
        apy: 0.09,
        userPosition: '$169k',
        userApy: 0.11,
    },
]

export function useEarnStrategies() {
    const [filterEmpty, setFilterEmpty] = useState(false)
    
    const filteredRows = useMemo(() => {
        if (!filterEmpty) return dummyRows

        return dummyRows.filter(({ userPosition }) => !!userPosition)
    }, [filterEmpty])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'My Position',
        dir: 'desc',
    })

    const sortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Asset Pair': {
                return filteredRows.toSorted(({ pair: a }, { pair: b }) => {
                    return sorting.dir === 'desc'
                        ? (a[0] > b[0] ? 1: -1)
                        : (a[0] < b[0] ? 1: -1)
                })
            }
            case 'Strategy': {
                return filteredRows.toSorted(({ earnPlatform: a }, { earnPlatform: b}) => {
                    const stratA = a ? 'farm': 'borrow'
                    const stratB = b ? 'farm': 'borrow'
                    return sorting.dir === 'desc'
                        ? (stratA > stratB ? 1: -1)
                        : (stratA < stratB ? 1: -1)
                })
            }
            case 'TVL': {
                return filteredRows.toSorted(({ tvl: a }, { tvl: b }) => {
                    return sorting.dir === 'desc'
                        ? (a < b ? 1: -1)
                        : (a > b ? 1: -1)
                })
            }
            // case 'Vol. 24hr': {
            //     return filteredRows.toSorted(({ vol24hr: a }, { vol24hr: b }) => {
            //         if (!b) return -1
            //         if (!a) return 1
            //         return sorting.dir === 'desc'
            //             ? (a < b ? 1: -1)
            //             : (a > b ? 1: -1)
            //     })
            // }
            case 'Rewards APY': {
                return filteredRows.toSorted(({ apy: a }, { apy: b }) => {
                    return sorting.dir === 'desc'
                        ? b - a
                        : a - b
                })
            }
            // case 'My APY': {
            //     return filteredRows.toSorted(({ userApy: a }, { userApy: b }) => {
            //         if (!b) return -1
            //         if (!a) return 1
            //         return sorting.dir === 'desc'
            //             ? b - a
            //             : a - b
            //     })
            // }
            case 'My Position':
            default: {
                return filteredRows.toSorted(({ userPosition: a }, { userPosition: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? (a < b ? 1: -1)
                        : (a > b ? 1: -1)
                })
            }
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

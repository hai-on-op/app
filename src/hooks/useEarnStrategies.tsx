import { useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'

import type { SortableHeader, Sorting, Strategy } from '~/types'
import {
    ALL_COLLATERAL_TYPES_QUERY,
    HARDCODED_KITE,
    NETWORK_ID,
    ChainId,
    type QueryCollateralType,
    arrayToSorted,
    tokenAssets,
} from '~/utils'
import { useStoreState } from '~/store'

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

// TODO: calculate velodrome and uniswap pool values based on Kingfish doc
const dummyRows: Strategy[] = [
    {
        pair: ['HAI', 'ETH'],
        rewards: [
            {
                token: 'OP',
                emission: 0,
            },
            {
                token: 'KITE',
                emission: 0,
            },
        ],
        tvl: '',
        vol24hr: '',
        apy: 0,
        earnPlatform: 'uniswap',
    },
    {
        pair: ['HAI', 'SUSD'],
        rewards: [
            {
                token: 'OP',
                emission: 0,
            },
            {
                token: 'KITE',
                emission: 0,
            },
        ],
        tvl: '',
        vol24hr: '',
        apy: 0,
        earnPlatform: 'velodrome',
    },
]

const rewards: Record<string, { OP: number; KITE: number }> =
    NETWORK_ID === ChainId.MAINNET
        ? {
              WETH: {
                  OP: 25,
                  KITE: 20,
              },
              WSTETH: {
                  OP: 25,
                  KITE: 20,
              },
              OP: {
                  OP: 50,
                  KITE: 20,
              },
          }
        : {
              WBTC: {
                  OP: 10,
                  KITE: 10,
              },
              WETH: {
                  OP: 20,
                  KITE: 20,
              },
              STN: {
                  OP: 30,
                  KITE: 30,
              },
              TTM: {
                  OP: 40,
                  KITE: 40,
              },
              OP: {
                  OP: 50,
                  KITE: 50,
              },
          }
const DEFAULT_REWARDS = {
    OP: 0,
    KITE: 0,
}

export function useEarnStrategies() {
    const {
        vaultModel: { list, liquidationData },
    } = useStoreState((state) => state)

    const { data } = useQuery<{ collateralTypes: QueryCollateralType[] }>(ALL_COLLATERAL_TYPES_QUERY)

    const collateralStrategies: Strategy[] = useMemo(() => {
        if (!data?.collateralTypes) return dummyRows

        return data.collateralTypes
            .map((cType) => {
                const { symbol } =
                    tokenAssets[cType.id] ||
                    Object.values(tokenAssets).find(({ name }) => name.toLowerCase() === cType.id.toLowerCase()) ||
                    {}
                const cRewards = rewards[symbol] || DEFAULT_REWARDS
                // ((kite-daily-emission * kite-price + op-daily-emission * op-price) * 365) / (hai-debt-per-collateral * hai-redemption-price)
                // TODO: get KITE price
                const opPrice = parseFloat(liquidationData?.collateralLiquidationData['OP']?.currentPrice.value || '0')
                const nominal =
                    !liquidationData?.currentRedemptionPrice || !opPrice
                        ? Infinity
                        : ((cRewards.KITE * HARDCODED_KITE + cRewards.OP * opPrice) * 365) /
                          (parseFloat(cType.debtAmount) * parseFloat(liquidationData?.currentRedemptionPrice || '0'))
                const apy = nominal === Infinity ? 0 : Math.pow(1 + nominal / 12, 12) - 1
                return {
                    pair: [symbol || 'HAI'],
                    rewards: Object.entries(cRewards).map(([token, emission]) => ({ token, emission })),
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
    }, [data?.collateralTypes, list, liquidationData])

    const [filterEmpty, setFilterEmpty] = useState(false)

    const filteredRows = useMemo(() => {
        if (!filterEmpty) return collateralStrategies

        return collateralStrategies.filter(({ userPosition }) => !!userPosition && userPosition !== '0')
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
        rowsUnmodified: collateralStrategies,
        sorting,
        setSorting,
        filterEmpty,
        setFilterEmpty,
    }
}

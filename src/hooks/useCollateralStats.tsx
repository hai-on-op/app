import { useMemo, useState } from 'react'

import type { SortableHeader, Sorting } from '~/types'
import { arrayToSorted } from '~/utils'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { type CollateralStat } from '~/providers/AnalyticsProvider/useSystemData'
import { type TokenAnalyticsData } from '~/providers/AnalyticsProvider/useGebAnalytics'

const collateralHeaders: SortableHeader[] = [
    { label: 'Collateral Asset' },
    {
        label: 'ERC20',
        tooltip: `Address of the ERC20 collateral token`,
        unsortable: true,
    },
    {
        label: 'Oracle',
        tooltip: `Delayed oracle address for the collateral`,
        unsortable: true,
    },
    {
        label: 'Delayed Price',
        tooltip: `System price of the collateral, it is delayed from spot price, and updates every period to "Next Price"`,
    },
    {
        label: 'Next Price',
        tooltip: `Next system price of the collateral, this value is already quoted, and will impact the system on the next price update`,
    },
    {
        label: 'Stability Fee',
        tooltip: `Annual interest rate paid by Vault owners on their debt`,
    },
]

export function useCollateralInfo() {
    const {
        data: { tokenAnalyticsData: rows },
    } = useAnalytics()

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Collateral Asset',
        dir: 'desc',
    })

    const sortedRows = useMemo(() => {
        switch (sorting.key) {
            case 'Delayed Price':
                return arrayToSorted(rows, {
                    getProperty: (row) => row.currentPrice.toString(),
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Next Price':
                return arrayToSorted(rows, {
                    getProperty: (row) => row.nextPrice.toString(),
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Stability Fee':
                return arrayToSorted(rows, {
                    getProperty: (row) => row.stabilityFee.toString(),
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Collateral Asset':
            default:
                return arrayToSorted(rows, {
                    getProperty: (row) => row.symbol,
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
        }
    }, [rows, sorting])

    return {
        headers: collateralHeaders,
        rows: sortedRows,
        sorting,
        setSorting,
    }
}

const collateralStatHeaders: SortableHeader[] = [
    { label: 'Collateral Asset' },
    {
        label: 'Stability Fee',
        tooltip: `Annual interest rate paid by Vault owners on their debt`,
    },
    {
        label: 'Delayed Price',
        tooltip: `System price of the collateral, it is delayed from spot price, and updates every period to "Next Price"`,
    },
    {
        label: 'TVL',
        tooltip: `Total Value Locked - value of all collateral locked in vaults of a given collateral asset`,
    },
    {
        label: 'TVI',
        tooltip: `Total Value Issued - value of all HAI debt issued in vaults of a given collateral asset`,
    },
    {
        label: 'Collateral Ratio',
        tooltip: `System-wide ratio of TVL to TVI for a given collateral asset`,
    },
]

export type CollateralStatWithInfo = CollateralStat & {
    token: string
    delayedPrice?: TokenAnalyticsData['currentPrice']
    stabilityFee?: TokenAnalyticsData['stabilityFee']
}
export function useCollateralStats() {
    const {
        data: { tokenAnalyticsData },
        graphSummary: { collateralStats } = {},
    } = useAnalytics()

    const [sorting, setSorting] = useState<Sorting>({
        key: 'TVL',
        dir: 'desc',
    })

    const rows: CollateralStatWithInfo[] = useMemo(() => {
        return Object.entries(collateralStats || {}).map(([token, stat]) => {
            const { currentPrice, stabilityFee } = tokenAnalyticsData.find(({ symbol }) => symbol === token) || {}
            return {
                token,
                ...stat,
                delayedPrice: currentPrice,
                stabilityFee,
            }
        })
    }, [collateralStats, tokenAnalyticsData])

    const sortedRows = useMemo(() => {
        switch (sorting.key) {
            case 'TVI':
                return arrayToSorted(rows, {
                    getProperty: (row) => row.totalDebt?.usdRaw || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Collateral Ratio':
                return arrayToSorted(rows, {
                    getProperty: (row) => row.ratio?.raw || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Collateral Asset':
                return arrayToSorted(rows, {
                    getProperty: (row) => row.token,
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'Delayed Price':
                return arrayToSorted(rows, {
                    getProperty: (row) => row.delayedPrice?.toString() || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Stability Fee':
                return arrayToSorted(rows, {
                    getProperty: (row) => row.stabilityFee?.toString() || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'TVL':
            default:
                return arrayToSorted(rows, {
                    getProperty: (row) => row.totalCollateral?.usdRaw || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
        }
    }, [rows, sorting])

    return {
        headers: collateralStatHeaders,
        rows: sortedRows,
        sorting,
        setSorting,
    }
}

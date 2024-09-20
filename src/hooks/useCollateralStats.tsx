import { useMemo, useState } from 'react'

import type { CollateralStat, SortableHeader, Sorting } from '~/types'
import { arrayToSorted, transformToAnnualRate } from '~/utils'
import { useAnalytics } from '~/providers/AnalyticsProvider'

const collateralHeaders: SortableHeader[] = [
    { label: 'Collateral Asset' },
    {
        label: 'ERC20',
        tooltip: `Address of the ERC20 collateral token`,
        unsortable: true,
    },
    {
        label: 'Vault Contract',
        tooltip: `Address of the protocol vault contract for the specified collateral`,
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
        label: 'TVL',
        tooltip: `Total Value Locked - value of all collateral locked in vaults of a given collateral asset`,
    },
    {
        label: 'Debt Issued',
        tooltip: `Debt Issued - value of all HAI debt issued in vaults of a given collateral asset`,
    },
    {
        label: 'Debt Ceiling %',
        tooltip: `Percentage of the collateral's debt ceiling that has been used`,
    },
    {
        label: 'Collateral Ratio',
        tooltip: `System-wide ratio of TVL to TVI for a given collateral asset`,
    },
    {
        label: 'Stability Fee',
        tooltip: `Annual interest rate paid by Vault owners on their debt`,
    },
    {
        label: 'Annual Earnings',
        tooltip: `Projected earnings of the protocol calculated by multiplying the Stability Fee by Debt Issued`,
    },
]

export type CollateralStatWithInfo = CollateralStat & {
    token: string
    stabilityFee?: number
    annualEarnings?: number
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
            const { stabilityFee: sfBN } = tokenAnalyticsData.find(({ symbol }) => symbol === token) || {}
            const stabilityFee = sfBN ? (transformToAnnualRate(sfBN.toString(), 27, true) as number) : 0

            return {
                token,
                ...stat,
                debtCeilingPercent: stat.debt?.ceilingPercent,
                stabilityFee,
                annualEarnings: parseFloat(stat.totalDebt?.raw || '0') * stabilityFee,
            }
        })
    }, [collateralStats, tokenAnalyticsData])

    const sortedRows = useMemo(() => {
        switch (sorting.key) {
            case 'Debt Issued':
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
            case 'Annual Earnings':
                return arrayToSorted(rows, {
                    getProperty: (row) => row.annualEarnings || 0,
                    dir: sorting.dir,
                    type: 'numerical',
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

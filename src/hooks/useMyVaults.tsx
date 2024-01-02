import { useMemo, useState } from 'react'

import type { SortableHeader, Sorting } from '~/types'
import { useStoreState } from '~/store'

const sortableHeaders: SortableHeader[] = [
    { label: 'Vault' },
    { label: 'Risk Ratio' },
    { label: 'Collateral' },
    { label: 'Debt' },
    { label: 'Net APY' },
    {
        label: '',
        unsortable: true,
    },
]

export function useMyVaults() {
    const { vaultModel: { list } } = useStoreState(state => state)

    const [assetsFilter, setAssetsFilter] = useState<string>()

    const myVaults = useMemo(() => {
        const temp = list
        if (!assetsFilter) return temp

        return temp.filter(({ collateralName }) => (
            collateralName.toUpperCase() === assetsFilter
        ))
    }, [list, assetsFilter])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Risk Ratio',
        dir: 'desc',
    })

    const sortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Vault': {
                return myVaults.toSorted(({ id: a }, { id: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? (a < b ? 1: -1)
                        : (a > b ? 1: -1)
                })
            }
            case 'Risk Ratio': {
                return myVaults.toSorted(({ collateralRatio: a }, { collateralRatio: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
            case 'Collateral': {
                return myVaults.toSorted(({ collateral: a }, { collateral: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
            case 'Debt': {
                return myVaults.toSorted(({ totalDebt: a }, { totalDebt: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
            case 'Net APY':
            default: {
                return myVaults.toSorted((
                    { totalAnnualizedStabilityFee: a },
                    { totalAnnualizedStabilityFee: b }
                ) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? (a < b ? 1: -1)
                        : (a > b ? 1: -1)
                })
            }
        }
    }, [myVaults, sorting])

    return {
        headers: sortableHeaders,
        rows: sortedRows,
        rowsUnmodified: myVaults,
        sorting,
        setSorting,
        assetsFilter,
        setAssetsFilter,
    }
}

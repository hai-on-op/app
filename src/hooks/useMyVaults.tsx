import { useMemo, useState } from 'react'

import type { SortableHeader, Sorting } from '~/types'
import { arrayToSorted } from '~/utils'
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
            case 'Vault':
                return arrayToSorted(myVaults, {
                    getProperty: row => row.id,
                    dir: sorting.dir,
                    type: 'parseInt',
                })
            case 'Risk Ratio':
                return arrayToSorted(myVaults, {
                    getProperty: row => row.collateralRatio || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Collateral':
                return arrayToSorted(myVaults, {
                    getProperty: row => row.collateral || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Debt':
                return arrayToSorted(myVaults, {
                    getProperty: row => row.totalDebt || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Net APY':
            default:
                return arrayToSorted(myVaults, {
                    getProperty: row => row.totalAnnualizedStabilityFee || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
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

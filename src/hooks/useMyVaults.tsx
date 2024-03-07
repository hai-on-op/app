import { useMemo, useState } from 'react'

import type { SortableHeader, Sorting } from '~/types'
import { arrayToSorted } from '~/utils'
import { useStoreState } from '~/store'

const sortableHeaders: SortableHeader[] = [
    { label: 'Vault' },
    { label: 'Collateral Ratio' },
    { label: 'Collateral' },
    { label: 'Debt' },
    // { label: 'Net APY' },
    { label: 'Stability Fee' },
    {
        label: '',
        unsortable: true,
    },
]

export function useMyVaults() {
    const {
        vaultModel: { list },
    } = useStoreState((state) => state)

    const [showEmptyVaults, setShowEmptyVaults] = useState(true)

    const [assetsFilter, setAssetsFilter] = useState<string>()

    const myVaults = useMemo(() => {
        let temp = [...list]
        if (!showEmptyVaults)
            temp = temp.filter(
                ({ collateral, debt }) => parseFloat(collateral || '0') > 0 || parseFloat(debt || '0') > 0
            )
        if (assetsFilter) temp = temp.filter(({ collateralName }) => collateralName.toUpperCase() === assetsFilter)
        return temp
    }, [list, assetsFilter, showEmptyVaults])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Collateral Ratio',
        dir: 'asc',
    })

    const sortedRows = useMemo(() => {
        switch (sorting.key) {
            case 'Vault':
                return arrayToSorted(myVaults, {
                    getProperty: (row) => row.id,
                    dir: sorting.dir,
                    type: 'parseInt',
                })
            case 'Collateral Ratio':
                return arrayToSorted(myVaults, {
                    getProperty: (row) => row.collateralRatio,
                    dir: sorting.dir,
                    type: 'parseFloat',
                    checkValueExists: true,
                })
            case 'Collateral':
                return arrayToSorted(myVaults, {
                    getProperty: (row) => row.collateral || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Debt':
                return arrayToSorted(myVaults, {
                    getProperty: (row) => row.totalDebt || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            // case 'Net APY':
            //     return arrayToSorted(myVaults, {
            //         getProperty: (row) => row.totalAnnualizedStabilityFee || '0',
            //         dir: sorting.dir,
            //         type: 'parseFloat',
            //     })
            case 'Stability Fee':
            default:
                return arrayToSorted(myVaults, {
                    getProperty: (row) => row.totalAnnualizedStabilityFee || '0',
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
        showEmptyVaults,
        setShowEmptyVaults,
    }
}

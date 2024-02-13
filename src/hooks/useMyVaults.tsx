import { useMemo, useState } from 'react'

import type { SortableHeader, Sorting } from '~/types'
import { arrayToSorted } from '~/utils'
import { useStoreState } from '~/store'

const sortableHeaders: SortableHeader[] = [
    { label: 'Vault' },
    { label: 'Collateral Ratio' },
    { label: 'Collateral' },
    { label: 'Debt' },
    { label: 'Net APY' },
    {
        label: '',
        unsortable: true,
    },
]

export function useMyVaults() {
    const {
        vaultModel: { list },
    } = useStoreState((state) => state)

    const [showClosedVaults, setShowClosedVaults] = useState(false)

    const [assetsFilter, setAssetsFilter] = useState<string>()

    const myVaults = useMemo(() => {
        let temp = [...list]
        if (!showClosedVaults)
            temp = temp.filter(
                ({ collateral, debt }) => parseFloat(collateral || '0') > 0 && parseFloat(debt || '0') > 0
            )
        if (assetsFilter) temp = temp.filter(({ collateralName }) => collateralName.toUpperCase() === assetsFilter)
        return temp
    }, [list, assetsFilter, showClosedVaults])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Risk Ratio',
        dir: 'desc',
    })

    const sortedRows = useMemo(() => {
        switch (sorting.key) {
            case 'Vault':
                return arrayToSorted(myVaults, {
                    getProperty: (row) => row.id,
                    dir: sorting.dir,
                    type: 'parseInt',
                })
            case 'Risk Ratio':
                return arrayToSorted(myVaults, {
                    getProperty: (row) => row.collateralRatio || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
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
            case 'Net APY':
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
        showClosedVaults,
        setShowClosedVaults,
    }
}

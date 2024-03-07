import { useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'

import type { SortableHeader, Sorting } from '~/types'
import {
    ALLSAFES_QUERY_NOT_ZERO,
    ALLSAFES_QUERY_WITH_ZERO,
    type QuerySafe,
    arrayToSorted,
    formatQuerySafeToVault,
} from '~/utils'
import { useStoreState } from '~/store'

import { type FlexProps } from '~/styles'

const sortableHeaders: (SortableHeader & FlexProps)[] = [
    { label: 'Vault' },
    { label: 'Owner' },
    { label: 'Collateral' },
    { label: 'Debt' },
    { label: 'Collateral Ratio' },
    {
        label: '',
        unsortable: true,
    },
]

const MAX_VAULTS_TO_FETCH = 500

type OrderBy = 'collateral' | 'cRatio' | 'debt'
export function useAllVaults() {
    const { vaultModel: vaultState } = useStoreState((state) => state)

    const [filterEmpty, setFilterEmpty] = useState(false)
    const [collateralFilter, setCollateralFilter] = useState<string>()

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Collateral Ratio',
        dir: 'asc',
    })

    const orderBy: OrderBy = useMemo(() => {
        switch (sorting.key) {
            case 'Collateral':
                return 'collateral'
            case 'Debt':
                return 'debt'
            default:
                return 'cRatio'
        }
    }, [sorting.key])

    const { data, error, loading, refetch } = useQuery<{ safes: QuerySafe[] }>(
        filterEmpty ? ALLSAFES_QUERY_NOT_ZERO : ALLSAFES_QUERY_WITH_ZERO,
        {
            variables: {
                first: MAX_VAULTS_TO_FETCH,
                skip: 0,
                orderBy,
                orderDirection: sorting.dir,
            },
        }
    )

    const vaultsWithCRatioAndToken = useMemo(() => {
        const { collateralLiquidationData, currentRedemptionPrice } = vaultState.liquidationData || {}
        if (!data?.safes?.length || !collateralLiquidationData || !currentRedemptionPrice) return []

        return data.safes.map((safe) => {
            return formatQuerySafeToVault(safe, collateralLiquidationData, currentRedemptionPrice)
        })
    }, [data?.safes, vaultState.liquidationData])

    const sortedRows = useMemo(() => {
        switch (sorting.key) {
            case 'Vault':
                return arrayToSorted(vaultsWithCRatioAndToken, {
                    getProperty: (vault) => vault.safeId,
                    dir: sorting.dir,
                    type: 'parseInt',
                })
            case 'Owner':
                return arrayToSorted(vaultsWithCRatioAndToken, {
                    getProperty: (vault) => vault.owner.address,
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'Collateral':
                return arrayToSorted(vaultsWithCRatioAndToken, {
                    getProperty: (vault) => vault.collateral,
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Debt':
                return arrayToSorted(vaultsWithCRatioAndToken, {
                    getProperty: (vault) => vault.debt,
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Collateral Ratio':
            default:
                return arrayToSorted(vaultsWithCRatioAndToken, {
                    getProperty: (vault) =>
                        vault.cRatio && vault.cRatio !== '0' ? vault.cRatio : vault.collateralRatio,
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
        }
    }, [vaultsWithCRatioAndToken, sorting])

    const filteredAndSortedRows = useMemo(() => {
        if (!collateralFilter || collateralFilter === 'All') return sortedRows

        return sortedRows.filter(({ collateralToken }) => collateralFilter === collateralToken)
    }, [sortedRows, collateralFilter])

    return {
        error,
        loading,
        refetch,
        headers: sortableHeaders,
        rows: filteredAndSortedRows,
        rowsUnmodified: vaultsWithCRatioAndToken,
        sorting,
        setSorting,
        filterEmpty,
        setFilterEmpty,
        collateralFilter,
        setCollateralFilter,
    }
}

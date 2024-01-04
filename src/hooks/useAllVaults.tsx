import { useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'

import type { SortableHeader, Sorting } from '~/types'
import {
    ALLSAFES_QUERY_NOT_ZERO,
    ALLSAFES_QUERY_WITH_ZERO,
    type QuerySafe,
    arrayToSorted,
    getCollateralRatio,
    ratioChecker,
    riskStateToStatus,
    tokenAssets,
} from '~/utils'

import { type FlexProps } from '~/styles'

const sortableHeaders: (SortableHeader & FlexProps)[] = [
    {
        label: 'Vault',
        $justify: 'flex-start',
    },
    {
        label: 'Owner',
        $justify: 'flex-start',
    },
    {
        label: 'Collateral',
        $justify: 'flex-end',
    },
    {
        label: 'Debt',
        $justify: 'flex-end',
    },
    { label: 'Collateral Ratio' },
    {
        label: '',
        unsortable: true,
    },
]

const MAX_VAULTS_TO_FETCH = 500

export function useAllVaults() {
    const [filterEmpty, setFilterEmpty] = useState(false)
    const [collateralFilter, setCollateralFilter] = useState<string>()

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Collateral Ratio',
        dir: 'asc',
    })

    const { data, error, loading } = useQuery<{ safes: QuerySafe[] }>(
        filterEmpty ? ALLSAFES_QUERY_NOT_ZERO: ALLSAFES_QUERY_WITH_ZERO,
        {
            variables: {
                first: MAX_VAULTS_TO_FETCH,
                skip: 0,
                orderBy: 'collateral',
                orderDirection: 'desc',
            },
        }
    )

    const vaultsWithCRatioAndToken = useMemo(() => {
        if (!data?.safes?.length) return []

        return data.safes.map(vault => {
            const collateralRatio = !vault.debt || vault.debt === '0'
                ? Infinity.toString()
                : getCollateralRatio(
                    vault.collateral,
                    vault.debt,
                    vault.collateralType.currentPrice.liquidationPrice,
                    vault.collateralType.liquidationCRatio
                )
            const status = riskStateToStatus[
                ratioChecker(
                    parseFloat(collateralRatio),
                    parseFloat(vault.collateralType.safetyCRatio)
                )
            ]
            const collateralToken = Object.values(tokenAssets).find(({ name, symbol }) => (
                vault.collateralType.id === name || vault.collateralType.id === symbol
            ))?.symbol || vault.collateralType.id
            return {
                ...vault,
                collateralRatio,
                collateralToken,
                status,
            }
        })
    }, [data?.safes])

    const sortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Vault':
                return arrayToSorted(vaultsWithCRatioAndToken, {
                    getProperty: vault => vault.safeId,
                    dir: sorting.dir,
                    type: 'parseInt',
                })
            case 'Owner':
                return arrayToSorted(vaultsWithCRatioAndToken, {
                    getProperty: vault => vault.owner.address,
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'Collateral':
                return arrayToSorted(vaultsWithCRatioAndToken, {
                    getProperty: vault => vault.collateral,
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Debt':
                return arrayToSorted(vaultsWithCRatioAndToken, {
                    getProperty: vault => vault.debt,
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Collateral Ratio':
            default:
                return arrayToSorted(vaultsWithCRatioAndToken, {
                    getProperty: vault => vault.collateralRatio,
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
        }
    }, [vaultsWithCRatioAndToken, sorting])

    const filteredAndSortedRows = useMemo(() => {
        if (!collateralFilter || collateralFilter === 'All') return sortedRows

        return sortedRows.filter(({ collateralToken }) => (
            collateralFilter === collateralToken
        ))
    }, [sortedRows, collateralFilter])

    return {
        error,
        loading,
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

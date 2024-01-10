import { useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'
import { isAddress } from 'viem'

import type { SortableHeader, Sorting } from '~/types'
import {
    SAFES_BY_OWNER,
    type QuerySafe,
    arrayToSorted,
    getCollateralRatio,
    ratioChecker,
    riskStateToStatus,
    tokenAssets,
} from '~/utils'

const sortableHeaders: SortableHeader[] = [
    {
        label: 'Vault',
        // $justify: 'flex-start',
    },
    {
        label: 'Collateral',
        // $justify: 'flex-end',
    },
    {
        label: 'Debt',
        // $justify: 'flex-end',
    },
    { label: 'Collateral Ratio' },
    {
        label: '',
        unsortable: true,
    },
]

export function useVaultsByOwner(address?: string) {
    const [collateralFilter, setCollateralFilter] = useState<string>()

    const addressIsAddress = isAddress(address || '')

    const { data, loading, error } = useQuery<{ safes: QuerySafe[] }>(
        SAFES_BY_OWNER,
        {
            variables: { address: address?.toLowerCase() },
            skip: !addressIsAddress,
        }
    )

    const vaultsWithCRatioAndToken = useMemo(() => {
        if (!data?.safes?.length) return []

        return data.safes.map(vault => {
            // TODO: calculate totalDebt?
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

    const filteredVaults = useMemo(() => {
        if (!collateralFilter) return vaultsWithCRatioAndToken

        return vaultsWithCRatioAndToken.filter(({ collateralToken }) => (
            collateralFilter === collateralToken
        ))
    }, [collateralFilter, vaultsWithCRatioAndToken])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Collateral Ratio',
        dir: 'asc',
    })

    const filteredAndSortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Vault':
                return arrayToSorted(filteredVaults, {
                    getProperty: vault => vault.safeId,
                    dir: sorting.dir,
                    type: 'parseInt',
                })
            case 'Collateral':
                return arrayToSorted(filteredVaults, {
                    getProperty: vault => vault.collateral,
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Debt':
                return arrayToSorted(filteredVaults, {
                    getProperty: vault => vault.debt,
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Collateral Ratio':
            default:
                return arrayToSorted(filteredVaults, {
                    getProperty: vault => vault.collateralRatio,
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
        }
    }, [filteredVaults, sorting])

    return {
        invalidAddress: !addressIsAddress,
        error,
        loading,
        headers: sortableHeaders,
        rows: filteredAndSortedRows,
        rowsUnmodified: vaultsWithCRatioAndToken,
        sorting,
        setSorting,
        collateralFilter,
        setCollateralFilter,
    }
}

import { useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'
import { isAddress } from 'viem'

import type { SortableHeader, Sorting } from '~/types'
import { SAFES_BY_OWNER, type QuerySafe, arrayToSorted, formatQuerySafeToVault, PROXY_OWNER_QUERY } from '~/utils'
import { useStoreState } from '~/store'

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
    const { vaultModel: vaultState } = useStoreState((state) => state)

    const [collateralFilter, setCollateralFilter] = useState<string>()

    const addressIsAddress = isAddress(address || '')

    const { data: ownerData } = useQuery<{ userProxies: { owner: { address: string } }[] }>(PROXY_OWNER_QUERY, {
        variables: { address: address?.toLowerCase() },
        skip: !addressIsAddress,
    })

    const owner = ownerData?.userProxies[0]?.owner.address

    const { data, loading, error, refetch } = useQuery<{ safes: QuerySafe[] }>(SAFES_BY_OWNER, {
        variables: { address: owner?.toLowerCase() || address?.toLowerCase() },
        skip: !addressIsAddress,
    })

    const vaultsWithCRatioAndToken = useMemo(() => {
        const { collateralLiquidationData, currentRedemptionPrice } = vaultState.liquidationData || {}
        if (!data?.safes?.length || !collateralLiquidationData || !currentRedemptionPrice) return []

        return data.safes.map((safe) => {
            return formatQuerySafeToVault(safe, collateralLiquidationData, currentRedemptionPrice)
        })
    }, [data?.safes, vaultState.liquidationData])

    const filteredVaults = useMemo(() => {
        if (!collateralFilter) return vaultsWithCRatioAndToken

        return vaultsWithCRatioAndToken.filter(({ collateralToken }) => collateralFilter === collateralToken)
    }, [collateralFilter, vaultsWithCRatioAndToken])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Collateral Ratio',
        dir: 'asc',
    })

    const filteredAndSortedRows = useMemo(() => {
        switch (sorting.key) {
            case 'Vault':
                return arrayToSorted(filteredVaults, {
                    getProperty: (vault) => vault.safeId,
                    dir: sorting.dir,
                    type: 'parseInt',
                })
            case 'Collateral':
                return arrayToSorted(filteredVaults, {
                    getProperty: (vault) => vault.collateral,
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Debt':
                return arrayToSorted(filteredVaults, {
                    getProperty: (vault) => vault.debt,
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Collateral Ratio':
            default:
                return arrayToSorted(filteredVaults, {
                    getProperty: (vault) => vault.collateralRatio,
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
        }
    }, [filteredVaults, sorting])

    return {
        invalidAddress: !addressIsAddress,
        owner,
        error,
        loading,
        refetch,
        headers: sortableHeaders,
        rows: filteredAndSortedRows,
        rowsUnmodified: vaultsWithCRatioAndToken,
        sorting,
        setSorting,
        collateralFilter,
        setCollateralFilter,
    }
}

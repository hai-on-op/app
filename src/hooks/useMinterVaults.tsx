import { useMemo } from 'react'
import { ApolloError, useQuery, gql } from '@apollo/client'

const MINTER_VAULTS_QUERY = gql`
    query GetMinterVaults($collateralTypeIds: [ID!]!) {
        collateralTypes(where: { id_in: $collateralTypeIds }) {
            id
            debtAmount
        }
    }
`

const ALL_MINTER_SAFES_QUERY = gql`
    query GetAllMinterSafes($collateralTypeIds: [ID!]!, $limit: Int = 1000) {
        safes(
            where: { collateralType_in: $collateralTypeIds, debt_gt: 0 }
            orderBy: collateral
            orderDirection: desc
            first: $limit
        ) {
            debt
            collateralType {
                id
            }
            owner {
                address
            }
        }
    }
`

export type MinterVault = {
    id: string
    debtAmount: string
}

export type Safe = {
    debt: string
    collateralType: {
        id: string
    }
    owner: {
        address: string
    }
}

export type UserDebtMapping = {
    [userAddress: string]: string
}

export type VaultData = {
    cType: string
    totalMinted: string
    userMinted: string
    userDebtMapping: UserDebtMapping
}

export type MinterVaultsData = {
    loading: boolean
    error?: ApolloError
    data: Record<string, VaultData>
}

const minterVaultCollaterals = ['HAIVELO', 'ALETH', 'YV-VELO-ALETH-WETH']

export function useMinterVaults(address?: string): MinterVaultsData {
    const {
        data: vaultsData,
        loading: vaultsLoading,
        error: vaultsError,
    } = useQuery<{ collateralTypes: MinterVault[] }>(MINTER_VAULTS_QUERY, {
        variables: {
            collateralTypeIds: minterVaultCollaterals,
        },
        fetchPolicy: 'cache-and-network',
    })

    const {
        data: allSafesData,
        loading: allSafesLoading,
        error: allSafesError,
    } = useQuery<{ safes: Safe[] }>(ALL_MINTER_SAFES_QUERY, {
        variables: {
            collateralTypeIds: minterVaultCollaterals,
        },
        fetchPolicy: 'cache-and-network',
    })

    const formattedData = useMemo(() => {
        if (!vaultsData || !allSafesData) {
            return {}
        }

        const dataByCType: Record<string, VaultData> = {}

        for (const cTypeData of vaultsData.collateralTypes) {
            dataByCType[cTypeData.id] = {
                cType: cTypeData.id,
                totalMinted: cTypeData.debtAmount,
                userMinted: '0',
                userDebtMapping: {},
            }
        }

        for (const safe of allSafesData.safes) {
            const cTypeId = safe.collateralType.id
            if (!dataByCType[cTypeId]) continue

            const ownerAddress = safe.owner.address.toLowerCase()
            const debtAmount = parseFloat(safe.debt)

            const currentDebt = dataByCType[cTypeId].userDebtMapping[ownerAddress] || '0'
            dataByCType[cTypeId].userDebtMapping[ownerAddress] = (parseFloat(currentDebt) + debtAmount).toString()

            if (address && ownerAddress === address.toLowerCase()) {
                const currentUserMinted = dataByCType[cTypeId].userMinted || '0'
                dataByCType[cTypeId].userMinted = (parseFloat(currentUserMinted) + debtAmount).toString()
            }
        }

        return dataByCType
    }, [vaultsData, allSafesData, address])

    return {
        loading: vaultsLoading || allSafesLoading,
        error: vaultsError || allSafesError,
        data: formattedData,
    }
}

import { useMemo } from 'react'
import { ApolloError, useQuery, gql } from '@apollo/client'
// import { formatSummaryValue } from '~/utils'
import { useAccount } from 'wagmi'

// Define the GraphQL query to fetch HAIVELO collateral data
const HAIVELO_COLLATERAL_QUERY = gql`
    query GetTotalCollateralByType($collateralTypeId: ID!) {
        collateralType(id: $collateralTypeId) {
            id
            totalCollateral
        }
    }
`

// Query to get user safes by collateral type
const USER_SAFES_QUERY = gql`
    query GetSafesByCollateralTypeAndOwner($collateralTypeId: ID!, $ownerId: ID, $limit: Int = 1000) {
        safes(
            where: { collateralType_: { id: $collateralTypeId }, owner_: { id: $ownerId } }
            orderBy: collateral
            orderDirection: desc
            first: $limit
        ) {
            id
            safeId
            collateral
            debt
            cRatio
            safeHandler
            owner {
                id
                address
            }
            createdAt
            modifiedAt
        }
    }
`

// Query to get all safes by collateral type
const ALL_SAFES_QUERY = gql`
    query GetAllSafesByCollateralType($collateralTypeId: ID!, $limit: Int = 1000) {
        safes(
            where: { collateralType_: { id: $collateralTypeId } }
            orderBy: collateral
            orderDirection: desc
            first: $limit
        ) {
            id
            safeId
            collateral
            debt
            cRatio
            safeHandler
            owner {
                id
                address
            }
            createdAt
            modifiedAt
        }
    }
`

// Type definitions for query response
export type HaiVeloCollateralData = {
    collateralType: {
        id: string
        totalCollateral: string
    }
}

// Type for user safes
export type UserSafe = {
    id: string
    safeId: string
    collateral: string
    debt: string
    cRatio: string
    safeHandler: string
    owner: {
        id: string
        address: string
    }
    createdAt: string
    modifiedAt: string
}

export type UserSafesData = {
    safes: UserSafe[]
}

export type AllSafesData = {
    safes: UserSafe[]
}

// Type for user collateral mapping
export type UserCollateralMapping = {
    [userAddress: string]: string
}

export type HaiVeloData = {
    loading: boolean
    error?: ApolloError
    data?: HaiVeloCollateralData
    totalHaiVELODeposited: string
    userHaiVELODeposited: string
    userCollateralMapping: UserCollateralMapping
}

export function useHaiVeloData(): HaiVeloData {
    const { address } = useAccount()
    //const address = '0x328cace41eadf6df6e693b8e4810bf97aac4f5ee'

    // Query the GraphQL API for HAIVELO collateral data (v1)
    const { data, loading, error } = useQuery<HaiVeloCollateralData>(HAIVELO_COLLATERAL_QUERY, {
        variables: {
            collateralTypeId: 'HAIVELO',
        },
        fetchPolicy: 'cache-and-network',
    })

    // Query the GraphQL API for HAIVELO v2 collateral data
    const {
        data: dataV2,
        loading: loadingV2,
        error: errorV2,
    } = useQuery<HaiVeloCollateralData>(HAIVELO_COLLATERAL_QUERY, {
        variables: {
            collateralTypeId: 'HAIVELOV2',
        },
        fetchPolicy: 'cache-and-network',
    })

    // Query user's HAIVELO safes if address is available (v1)
    const { data: userSafesData, loading: userSafesLoading } = useQuery<UserSafesData>(USER_SAFES_QUERY, {
        variables: {
            collateralTypeId: 'HAIVELO',
            ownerId: address?.toLowerCase() || '',
        },
        skip: !address,
        fetchPolicy: 'cache-and-network',
    })

    // Query user's HAIVELO v2 safes if address is available
    const { data: userSafesDataV2, loading: userSafesLoadingV2 } = useQuery<UserSafesData>(USER_SAFES_QUERY, {
        variables: {
            collateralTypeId: 'HAIVELOV2',
            ownerId: address?.toLowerCase() || '',
        },
        skip: !address,
        fetchPolicy: 'cache-and-network',
    })

    // Query all HAIVELO safes (v1)
    const { data: allSafesData, loading: allSafesLoading } = useQuery<AllSafesData>(ALL_SAFES_QUERY, {
        variables: {
            collateralTypeId: 'HAIVELO',
        },
        fetchPolicy: 'cache-and-network',
    })

    // Query all HAIVELO v2 safes
    const { data: allSafesDataV2, loading: allSafesLoadingV2 } = useQuery<AllSafesData>(ALL_SAFES_QUERY, {
        variables: {
            collateralTypeId: 'HAIVELOV2',
        },
        fetchPolicy: 'cache-and-network',
    })

    // Format and extract the data using useMemo to prevent unnecessary recalculations
    const formattedData = useMemo(() => {
        if (!data && !dataV2) {
            return {
                totalHaiVELODeposited: '0',
                userHaiVELODeposited: '0',
                userCollateralMapping: {},
            }
        }

        // Extract total collateral amounts (v1 and v2)
        const totalCollateralV1 = parseFloat(data?.collateralType.totalCollateral || '0')
        const totalCollateralV2 = parseFloat(dataV2?.collateralType.totalCollateral || '0')
        const combinedTotalCollateral = (totalCollateralV1 + totalCollateralV2).toString()

        // Format the values for display
        // const formattedTotal = formatSummaryValue(totalCollateral, {
        //     maxDecimals: 2,
        // }) || { formatted: '0' }

        // Calculate user's total HAIVELO deposits if user data is available
        let userDeposited = '0'
        const userCollateralV1 = (userSafesData?.safes || []).reduce(
            (total, safe) => total + parseFloat(safe.collateral),
            0
        )
        const userCollateralV2 = (userSafesDataV2?.safes || []).reduce(
            (total, safe) => total + parseFloat(safe.collateral),
            0
        )
        userDeposited = (userCollateralV1 + userCollateralV2).toString()

        // Create mapping of user addresses to their collateral amounts
        const userCollateralMapping: UserCollateralMapping = {}

        const addToMapping = (safes?: UserSafe[]) => {
            if (!safes || safes.length === 0) return
            safes.forEach((safe) => {
                const ownerAddress = safe.owner.address.toLowerCase()
                const collateralAmount = parseFloat(safe.collateral)
                if (userCollateralMapping[ownerAddress]) {
                    userCollateralMapping[ownerAddress] = (
                        parseFloat(userCollateralMapping[ownerAddress]) + collateralAmount
                    ).toString()
                } else {
                    userCollateralMapping[ownerAddress] = collateralAmount.toString()
                }
            })
        }

        // Group safes by owner address and sum their collateral across v1 and v2
        addToMapping(allSafesData?.safes)
        addToMapping(allSafesDataV2?.safes)

        return {
            totalHaiVELODeposited: combinedTotalCollateral || '0',
            userHaiVELODeposited: userDeposited || '0',
            userCollateralMapping,
        }
    }, [data, dataV2, userSafesData, userSafesDataV2, allSafesData, allSafesDataV2])

    // Return the data object with loading and error states
    return {
        loading: loading || userSafesLoading || allSafesLoading || loadingV2 || userSafesLoadingV2 || allSafesLoadingV2,
        error: error || errorV2,
        data,
        ...formattedData,
    }
}

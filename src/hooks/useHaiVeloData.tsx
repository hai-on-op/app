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

    // Query the GraphQL API for HAIVELO collateral data
    const { data, loading, error } = useQuery<HaiVeloCollateralData>(HAIVELO_COLLATERAL_QUERY, {
        variables: {
            collateralTypeId: 'HAIVELO',
        },
        fetchPolicy: 'cache-and-network',
    })

    // Query user's HAIVELO safes if address is available
    const { data: userSafesData, loading: userSafesLoading } = useQuery<UserSafesData>(USER_SAFES_QUERY, {
        variables: {
            collateralTypeId: 'HAIVELO',
            ownerId: address?.toLowerCase() || '',
        },
        skip: !address,
        fetchPolicy: 'cache-and-network',
    })

    // Query all HAIVELO safes
    const { data: allSafesData, loading: allSafesLoading } = useQuery<AllSafesData>(ALL_SAFES_QUERY, {
        variables: {
            collateralTypeId: 'HAIVELO',
        },
        fetchPolicy: 'cache-and-network',
    })

    // Format and extract the data using useMemo to prevent unnecessary recalculations
    const formattedData = useMemo(() => {
        if (!data) {
            return {
                totalHaiVELODeposited: '0',
                userHaiVELODeposited: '0',
                userCollateralMapping: {},
            }
        }

        // Extract the total collateral amount
        const { totalCollateral } = data.collateralType

        // Format the values for display
        // const formattedTotal = formatSummaryValue(totalCollateral, {
        //     maxDecimals: 2,
        // }) || { formatted: '0' }

        // Calculate user's total HAIVELO deposits if user data is available
        let userDeposited = '0'
        if (userSafesData?.safes && userSafesData.safes.length > 0) {
            // Sum up all collateral from user's safes
            const totalUserCollateral = userSafesData.safes
                .reduce((total, safe) => total + parseFloat(safe.collateral), 0)
                .toString()

            // // Format user's total
            // const formattedUserTotal = formatSummaryValue(totalUserCollateral, {
            //   maxDecimals: 2
            // }) || { formatted: '0' }

            // userDeposited = formattedUserTotal.formatted
            userDeposited = totalUserCollateral
        }

        // Create mapping of user addresses to their collateral amounts
        const userCollateralMapping: UserCollateralMapping = {}

        if (allSafesData?.safes && allSafesData.safes.length > 0) {
            // Group safes by owner address and sum their collateral
            allSafesData.safes.forEach((safe) => {
                const ownerAddress = safe.owner.address.toLowerCase()
                const collateralAmount = parseFloat(safe.collateral)

                if (userCollateralMapping[ownerAddress]) {
                    // Add to existing collateral for this user
                    userCollateralMapping[ownerAddress] = (
                        parseFloat(userCollateralMapping[ownerAddress]) + collateralAmount
                    ).toString()
                } else {
                    // First safe for this user
                    userCollateralMapping[ownerAddress] = collateralAmount.toString()
                }
            })
        }

        return {
            totalHaiVELODeposited: totalCollateral || '0',
            userHaiVELODeposited: userDeposited || '0',
            userCollateralMapping,
        }
    }, [data, userSafesData, allSafesData])

    // Return the data object with loading and error states
    return {
        loading: loading || userSafesLoading || allSafesLoading,
        error,
        data,
        ...formattedData,
    }
}

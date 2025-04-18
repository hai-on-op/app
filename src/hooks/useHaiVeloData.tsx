import { useMemo } from 'react'
import { ApolloError, useQuery, gql } from '@apollo/client'
import { formatSummaryValue } from '~/utils'
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

export type HaiVeloData = {
    loading: boolean
    error?: ApolloError
    data?: HaiVeloCollateralData
    totalHaiVELODeposited: string
    userHaiVELODeposited: string
}

export function useHaiVeloData(): HaiVeloData {
    const { address } = useAccount()

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

    // Format and extract the data using useMemo to prevent unnecessary recalculations
    const formattedData = useMemo(() => {
        if (!data) {
            return {
                totalHaiVELODeposited: '0',
                userHaiVELODeposited: '0',
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

        return {
            totalHaiVELODeposited: totalCollateral || 0,
            userHaiVELODeposited: userDeposited || 0,
        }
    }, [data, userSafesData])

    // Return the data object with loading and error states
    return {
        loading: loading || userSafesLoading,
        error,
        data,
        ...formattedData,
    }
}

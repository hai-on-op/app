import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { useAccount } from 'wagmi'
import { HAI_MINTING_COLLATERAL_TYPES_QUERY, USER_HAI_MINTING_SAFES_QUERY } from '~/utils/graphql/queries'

export type HaiMintingCollateralType = {
    id: string
    debtAmount: string
    totalCollateral: string
    totalCollateralLockedInSafes: string
    safeCount: string
    currentPrice: {
        value: string
    }
}

export type UserHaiMintingSafe = {
    id: string
    debt: string
    collateral: string
    collateralType: {
        id: string
        debtAmount: string
    }
}

export type HaiMintingData = {
    loading: boolean
    error?: any
    totalHaiMinted: number
    userHaiMinted: number
    userHaiMintingRatio: number
    haiMintingBoost: number
    collateralTypes: HaiMintingCollateralType[]
    userSafes: UserHaiMintingSafe[]
}

export function useHaiMintingData(): HaiMintingData {
    const { address } = useAccount()

    // Query for HAI minting collateral types
    const {
        data: collateralTypesData,
        loading: collateralTypesLoading,
        error: collateralTypesError,
    } = useQuery<{ collateralTypes: HaiMintingCollateralType[] }>(HAI_MINTING_COLLATERAL_TYPES_QUERY, {
        fetchPolicy: 'cache-and-network',
    })

    // Query for user's HAI minting safes
    const {
        data: userSafesData,
        loading: userSafesLoading,
        error: userSafesError,
    } = useQuery<{ user: { safes: UserHaiMintingSafe[] } }>(USER_HAI_MINTING_SAFES_QUERY, {
        variables: {
            userAddress: address?.toLowerCase() || '',
        },
        skip: !address,
        fetchPolicy: 'cache-and-network',
    })

    const data = useMemo(() => {
        const loading = collateralTypesLoading || userSafesLoading
        const error = collateralTypesError || userSafesError

        if (loading || error || !collateralTypesData) {
            return {
                loading,
                error,
                totalHaiMinted: 0,
                userHaiMinted: 0,
                userHaiMintingRatio: 0,
                haiMintingBoost: 1,
                collateralTypes: [],
                userSafes: [],
            }
        }

        // Calculate total HAI minted across all minting collateral types
        const totalHaiMinted = collateralTypesData.collateralTypes.reduce((total, collateralType) => {
            return total + parseFloat(collateralType.debtAmount || '0')
        }, 0)

        // Calculate user's HAI minted from their safes
        const userSafes = userSafesData?.user?.safes || []
        const userHaiMinted = userSafes.reduce((total, safe) => {
            // Only count safes with the minting collateral types
            const isMintingCollateral = ['ALETH', 'YV-VELO-ALETH-WETH', 'HAIVELO'].includes(safe.collateralType.id)
            if (isMintingCollateral) {
                return total + parseFloat(safe.debt || '0')
            }
            return total
        }, 0)

        // Calculate user's HAI minting ratio
        const userHaiMintingRatio = totalHaiMinted > 0 ? userHaiMinted / totalHaiMinted : 0

        // Calculate HAI minting boost (similar to other boost calculations)
        // If user's minting ratio is higher than their staking ratio, they get a boost
        // For now, we'll use a simple calculation - this can be refined later
        const haiMintingBoost = userHaiMintingRatio > 0 ? Math.min(userHaiMintingRatio * 2, 2) : 1

        return {
            loading,
            error,
            totalHaiMinted,
            userHaiMinted,
            userHaiMintingRatio,
            haiMintingBoost,
            collateralTypes: collateralTypesData.collateralTypes,
            userSafes,
        }
    }, [collateralTypesData, userSafesData, collateralTypesLoading, userSafesLoading, collateralTypesError, userSafesError])

    return data
} 
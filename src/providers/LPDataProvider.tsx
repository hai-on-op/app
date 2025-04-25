import React, { createContext, useContext, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useStoreActions, useStoreState } from '~/store'
import type { CurrentUserPosition, PoolData, UserPosition } from '~/model/lpDataModel'

// Define the context type
type LPDataContextType = {
    pool: PoolData | null
    userPositions: UserPosition[] | null
    userCurrentPositionComposition: CurrentUserPosition[] | null
    loading: boolean
    error: any
    account: string | undefined
}

// Create context
const LPDataContext = createContext<LPDataContextType>({
    pool: null,
    userPositions: null,
    userCurrentPositionComposition: null,
    loading: false,
    error: null,
    account: undefined,
})

// Provider component
export function LPDataProvider({ children }: { children: React.ReactNode }) {
    const { address: account } = useAccount()

    // Get model state and actions
    const { pool, userPositions, userCurrentPositionComposition, loading, error, allPositions, userPositionsMap } =
        useStoreState((state) => state.lpDataModel)

    console.log(
        'allPositions',
        allPositions,
        userPositionsMap,
    )

    const {
        setAccount,
        fetchPoolData,
        fetchAllPositions,
        buildUserPositionsMap,
        calculateAllCurrentPositions,
        updateUserData,
    } = useStoreActions((actions) => actions.lpDataModel)

    // Set account in model when it changes
    useEffect(() => {
        setAccount(account)

        // If the account changes, update user-specific data
        if (account) {
            updateUserData(account)
        }
    }, [account, setAccount, updateUserData])

    // Initial data fetch - fetch all data once at startup
    useEffect(() => {
        // Only fetch all data once at initialization
        const initializeData = async () => {
            await fetchPoolData()
            await fetchAllPositions()
            await buildUserPositionsMap()
            await calculateAllCurrentPositions()

            // Update the current user's data if available
            if (account) {
                updateUserData(account)
            }
        }

        initializeData()

        // Set up polling every 5 minutes for pool data and all positions
        const poolDataInterval = setInterval(() => fetchPoolData(), 5 * 60 * 1000)
        const allPositionsInterval = setInterval(
            async () => {
                await fetchAllPositions()
                await buildUserPositionsMap()
                await calculateAllCurrentPositions()

                // Update user data after refreshing all positions
                if (account) {
                    updateUserData(account)
                }
            },
            5 * 60 * 1000
        )

        return () => {
            clearInterval(poolDataInterval)
            clearInterval(allPositionsInterval)
        }
    }, [fetchPoolData, fetchAllPositions, buildUserPositionsMap, calculateAllCurrentPositions, updateUserData, account])

    return (
        <LPDataContext.Provider
            value={{
                pool,
                userPositions,
                userCurrentPositionComposition,
                loading,
                error,
                account,
            }}
        >
            {children}
        </LPDataContext.Provider>
    )
}

// Hook to use the LP data
export function useLPData() {
    const context = useContext(LPDataContext)
    if (context === undefined) {
        throw new Error('useLPData must be used within a LPDataProvider')
    }
    return context
}

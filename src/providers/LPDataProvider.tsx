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
    const { pool, userPositions, userCurrentPositionComposition, loading, error } = useStoreState(
        (state) => state.lpDataModel
    )
    const { fetchPoolData, fetchUserPositions, calculateCurrentPositions, setAccount } = useStoreActions(
        (actions) => actions.lpDataModel
    )

    // Set account in model when it changes
    useEffect(() => {
        setAccount(account)
    }, [account, setAccount])

    // Initial fetch of pool data
    useEffect(() => {
        fetchPoolData()
        
        // Set up polling every 5 minutes
        const intervalId = setInterval(() => fetchPoolData(), 5 * 60 * 1000)
        return () => clearInterval(intervalId)
    }, [fetchPoolData])

    // Fetch user positions when account changes
    useEffect(() => {
        if (!account) return
        
        fetchUserPositions(account)
        
        // Set up polling every 5 minutes
        const intervalId = setInterval(() => fetchUserPositions(account), 5 * 60 * 1000)
        return () => clearInterval(intervalId)
    }, [account, fetchUserPositions])

    // Calculate current position composition when pool or positions change
    useEffect(() => {
        if (!userPositions || !pool || userPositions.length === 0) return
        
        calculateCurrentPositions()
    }, [userPositions, pool, calculateCurrentPositions])

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

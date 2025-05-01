import React, { createContext, useContext, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useStoreActions, useStoreState } from '~/store'
import type { CurrentUserPosition, PoolData, UserPosition, UserLPBoostMap, UserKiteRatioMap } from '~/model/lpDataModel'

// Define the context type
type LPDataContextType = {
    pool: PoolData | null
    userPositions: UserPosition[] | null
    userCurrentPositionComposition: CurrentUserPosition[] | null
    loading: boolean
    error: any
    account: string | undefined
    userLPPositionValue: string
    userTotalLiquidity: string
    allPositions: UserPosition[] | null
    userPositionsMap: Record<string, UserPosition[]>
    // LP boost data
    /** Maps user addresses to their calculated LP boost values (1-2x range) */
    userLPBoostMap: UserLPBoostMap
    /** Maps user addresses to their KITE staking ratio compared to total staked KITE */
    userKiteRatioMap: UserKiteRatioMap
}

// Create context
const LPDataContext = createContext<LPDataContextType>({
    pool: null,
    userPositions: null,
    userCurrentPositionComposition: null,
    loading: false,
    error: null,
    account: undefined,
    userLPPositionValue: '0',
    userTotalLiquidity: '0',
    allPositions: null,
    userPositionsMap: {},
    userLPBoostMap: {},
    userKiteRatioMap: {},
})

// Provider component
export function LPDataProvider({ children }: { children: React.ReactNode }) {
    const { address: account } = useAccount()

    // Get model state and actions
    const {
        pool,
        userPositions,
        userCurrentPositionComposition,
        loading,
        error,
        allPositions,
        userPositionsMap,
        userLPPositionValue,
        userPositionValuesMap,
        userTotalLiquidity,
        userLPBoostMap,
        userKiteRatioMap,
        userTotalLiquidityMap,
        userCurrentPositionsMap,
    } = useStoreState((state) => state.lpDataModel)

    console.log('user LP postion value', userLPPositionValue)

    // Get staking data from staking model
    const { usersStakingData, totalStaked } = useStoreState((state) => state.stakingModel)

    const {
        setAccount,
        fetchPoolData,
        fetchAllPositions,
        buildUserPositionsMap,
        calculateAllCurrentPositions,
        updateUserData,
        calculateAllUserLPBoosts,
    } = useStoreActions((actions) => actions.lpDataModel)

    // Set account in model when it changes
    useEffect(() => {
        setAccount(account)

        // If the account changes, update user-specific data
        if (account) {
            updateUserData(account)
        }
    }, [
        account,
        setAccount,
        allPositions,
        updateUserData,
        userCurrentPositionsMap,
        pool,
        userPositionValuesMap,
        userTotalLiquidityMap,
    ])

    // Calculate LP boosts whenever staking data or LP data changes
    useEffect(() => {
        if (usersStakingData && Object.keys(usersStakingData).length > 0 && totalStaked) {
            calculateAllUserLPBoosts({ usersStakingData, totalStaked })
        }
    }, [usersStakingData, totalStaked, calculateAllUserLPBoosts, userTotalLiquidityMap, pool])

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

            // Calculate LP boosts for all users
            if (usersStakingData && Object.keys(usersStakingData).length > 0 && totalStaked) {
                calculateAllUserLPBoosts({ usersStakingData, totalStaked })
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

                // Also recalculate boosts
                if (usersStakingData && Object.keys(usersStakingData).length > 0 && totalStaked) {
                    calculateAllUserLPBoosts({ usersStakingData, totalStaked })
                }
            },
            5 * 60 * 1000
        )

        return () => {
            clearInterval(poolDataInterval)
            clearInterval(allPositionsInterval)
        }
    }, [
        fetchPoolData,
        fetchAllPositions,
        buildUserPositionsMap,
        calculateAllCurrentPositions,
        updateUserData,
        account,
        usersStakingData,
        totalStaked,
        calculateAllUserLPBoosts,
    ])

    return (
        <LPDataContext.Provider
            value={{
                pool,
                userPositions,
                userCurrentPositionComposition,
                loading,
                error,
                account,
                userLPPositionValue,
                userTotalLiquidity,
                allPositions,
                userPositionsMap,
                userLPBoostMap,
                userKiteRatioMap,
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

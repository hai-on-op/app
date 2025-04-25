import { type Action, type Thunk, action, thunk } from 'easy-peasy'
import * as lpDataService from '~/services/lpData'
import type { StoreModel } from './index'

// Define user position type
export type UserPosition = {
    id: string
    liquidity: string
    depositedToken0: string
    depositedToken1: string
    withdrawnToken0: string
    withdrawnToken1: string
    tickLower: {
        tickIdx: string
    }
    tickUpper: {
        tickIdx: string
    }
    owner: string
}

// Define current user position type
export type CurrentUserPosition = {
    id: string
    liquidity: string
    currentToken0: string // Current amount of token0 in the position
    currentToken1: string // Current amount of token1 in the position
    tickLower: {
        tickIdx: string
    }
    tickUpper: {
        tickIdx: string
    }
    owner: string
}

// Define pool data type
export type PoolData = {
    id: string
    liquidity: string
    totalValueLockedToken0: string
    totalValueLockedToken1: string
    totalValueLockedUSD: string
    token0: {
        symbol: string
        decimals: number
    }
    token1: {
        symbol: string
        decimals: number
    }
    token0Price: string
    token1Price: string
    tick: string
    sqrtPrice: string
}

// Type for user position mappings
export type UserPositionsMap = Record<string, UserPosition[]>

// Type for user current position mappings
export type UserCurrentPositionsMap = Record<string, CurrentUserPosition[]>

export interface LPDataModel {
    // Original state for backward compatibility
    pool: PoolData | null
    setPool: Action<LPDataModel, PoolData | null>
    userPositions: UserPosition[] | null
    setUserPositions: Action<LPDataModel, UserPosition[] | null>
    userCurrentPositionComposition: CurrentUserPosition[] | null
    setUserCurrentPositionComposition: Action<LPDataModel, CurrentUserPosition[] | null>
    loading: boolean
    setLoading: Action<LPDataModel, boolean>
    error: any
    setError: Action<LPDataModel, any>
    account: string | undefined
    setAccount: Action<LPDataModel, string | undefined>
    
    // New state for enhanced functionality
    allPositions: UserPosition[] | null
    setAllPositions: Action<LPDataModel, UserPosition[] | null>
    userPositionsMap: UserPositionsMap
    setUserPositionsMap: Action<LPDataModel, UserPositionsMap>
    userCurrentPositionsMap: UserCurrentPositionsMap
    setUserCurrentPositionsMap: Action<LPDataModel, UserCurrentPositionsMap>
    
    // Actions and thunks
    fetchPoolData: Thunk<LPDataModel>
    fetchUserPositions: Thunk<LPDataModel, string | undefined>
    calculateCurrentPositions: Thunk<LPDataModel>
    
    // New thunks
    fetchAllPositions: Thunk<LPDataModel>
    buildUserPositionsMap: Thunk<LPDataModel>
    calculateAllCurrentPositions: Thunk<LPDataModel>
    updateUserData: Thunk<LPDataModel, string | undefined>
}

export const lpDataModel: LPDataModel = {
    // Original state
    pool: null,
    setPool: action((state, payload) => {
        state.pool = payload
    }),
    userPositions: null,
    setUserPositions: action((state, payload) => {
        state.userPositions = payload
    }),
    userCurrentPositionComposition: null,
    setUserCurrentPositionComposition: action((state, payload) => {
        state.userCurrentPositionComposition = payload
    }),
    loading: false,
    setLoading: action((state, payload) => {
        state.loading = payload
    }),
    error: null,
    setError: action((state, payload) => {
        state.error = payload
    }),
    account: undefined,
    setAccount: action((state, payload) => {
        state.account = payload
    }),
    
    // New state
    allPositions: null,
    setAllPositions: action((state, payload) => {
        state.allPositions = payload
    }),
    userPositionsMap: {},
    setUserPositionsMap: action((state, payload) => {
        state.userPositionsMap = payload
    }),
    userCurrentPositionsMap: {},
    setUserCurrentPositionsMap: action((state, payload) => {
        state.userCurrentPositionsMap = payload
    }),
    
    // Original thunks
    fetchPoolData: thunk(async (actions) => {
        try {
            actions.setLoading(true)
            const poolData = await lpDataService.fetchPoolData()
            
            if (poolData) {
                actions.setPool(poolData)
            }
            actions.setLoading(false)
        } catch (err) {
            console.error('Error fetching LP data:', err)
            actions.setError(err)
            actions.setLoading(false)
        }
    }),
    
    fetchUserPositions: thunk(async (actions, account, { getState }) => {
        if (!account) {
            actions.setUserPositions(null)
            return
        }

        try {
            actions.setLoading(true)
            
            // Try to get user positions from the map first
            const { allPositions } = getState()
            if (allPositions) {
                const userPositions = lpDataService.getUserPositionsFromAll(allPositions, account)
                actions.setUserPositions(userPositions)
            } else {
                // Fallback to direct fetch (though this should be deprecated)
                const positions = await lpDataService.fetchUserPositions(account)
                if (positions) {
                    actions.setUserPositions(positions)
                }
            }
            
            actions.setLoading(false)
        } catch (err) {
            console.error('Error fetching user positions:', err)
            actions.setError(err)
            actions.setLoading(false)
        }
    }),
    
    calculateCurrentPositions: thunk(async (actions, _, { getState }) => {
        const { userPositions, pool } = getState()
        
        if (!userPositions || !pool || userPositions.length === 0) {
            actions.setUserCurrentPositionComposition(null)
            return
        }

        try {
            const currentPositions = lpDataService.calculateCurrentPositionComposition(userPositions, pool)
            
            if (currentPositions) {
                actions.setUserCurrentPositionComposition(currentPositions)
            }
        } catch (err) {
            console.error('Error calculating current positions:', err)
            actions.setError(err)
        }
    }),
    
    // New thunks
    fetchAllPositions: thunk(async (actions) => {
        try {
            actions.setLoading(true)
            const allPositions = await lpDataService.fetchAllActivePositions()
            
            if (allPositions) {
                actions.setAllPositions(allPositions)
            }
            
            actions.setLoading(false)
        } catch (err) {
            console.error('Error fetching all positions:', err)
            actions.setError(err)
            actions.setLoading(false)
        }
    }),
    
    buildUserPositionsMap: thunk(async (actions, _, { getState }) => {
        const { allPositions } = getState()
        
        if (!allPositions || allPositions.length === 0) {
            return
        }
        
        try {
            const userMap = lpDataService.groupPositionsByUser(allPositions)
            actions.setUserPositionsMap(userMap)
        } catch (err) {
            console.error('Error building user positions map:', err)
            actions.setError(err)
        }
    }),
    
    calculateAllCurrentPositions: thunk(async (actions, _, { getState }) => {
        const { userPositionsMap, pool } = getState()
        
        if (!userPositionsMap || !pool || Object.keys(userPositionsMap).length === 0) {
            return
        }
        
        try {
            const userCurrentPositionsMap: UserCurrentPositionsMap = {}
            
            // Calculate current positions for each user
            for (const [address, positions] of Object.entries(userPositionsMap)) {
                const currentPositions = lpDataService.calculateCurrentPositionComposition(positions, pool)
                if (currentPositions) {
                    userCurrentPositionsMap[address] = currentPositions
                }
            }
            
            actions.setUserCurrentPositionsMap(userCurrentPositionsMap)
        } catch (err) {
            console.error('Error calculating all current positions:', err)
            actions.setError(err)
        }
    }),
    
    // Update all user data - central point for updating account-specific data
    updateUserData: thunk(async (actions, account, { getState, getStoreActions }) => {
        if (!account) return
        
        const { allPositions, pool } = getState()
        // Get actions directly - we'll use a workaround for typing
        const storeActions = getStoreActions() as any
        
        // If we don't have the pool data or all positions yet, fetch them
        if (!pool) {
            await storeActions.lpDataModel.fetchPoolData()
        }
        
        if (!allPositions) {
            await storeActions.lpDataModel.fetchAllPositions()
            await storeActions.lpDataModel.buildUserPositionsMap()
            await storeActions.lpDataModel.calculateAllCurrentPositions()
        }
        
        // Update the current user's data for backward compatibility
        const { allPositions: updatedAllPositions, userCurrentPositionsMap } = getState()
        if (updatedAllPositions) {
            const userPositions = lpDataService.getUserPositionsFromAll(updatedAllPositions, account)
            actions.setUserPositions(userPositions)
            
            // Set current position composition from the map if available
            const normalizedAddress = account.toLowerCase()
            if (userCurrentPositionsMap && userCurrentPositionsMap[normalizedAddress]) {
                actions.setUserCurrentPositionComposition(userCurrentPositionsMap[normalizedAddress])
            } else {
                // Otherwise calculate it directly (should be rare with the new flow)
                await storeActions.lpDataModel.calculateCurrentPositions()
            }
        }
    }),
} 
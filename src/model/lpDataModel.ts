import { type Action, type Thunk, action, thunk } from 'easy-peasy'
import * as lpDataService from '~/services/lpData'

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

export interface LPDataModel {
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
    
    fetchPoolData: Thunk<LPDataModel>
    fetchUserPositions: Thunk<LPDataModel, string | undefined>
    calculateCurrentPositions: Thunk<LPDataModel>
}

export const lpDataModel: LPDataModel = {
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
    
    fetchUserPositions: thunk(async (actions, account) => {
        if (!account) {
            actions.setUserPositions(null)
            return
        }

        try {
            actions.setLoading(true)
            const positions = await lpDataService.fetchUserPositions(account)
            
            if (positions) {
                actions.setUserPositions(positions)
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
} 
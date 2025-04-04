import React, { createContext, useContext, useEffect, useState } from 'react'
import { ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client'
import { NETWORK_ID, VITE_GRAPH_API_KEY } from '~/utils'
import { useAccount } from 'wagmi'

// Pool ID from the subgraph
const POOL_ID = '0x146b020399769339509c98b7b353d19130c150ec'

// Create the LP client based on env variable
const lpClient = new ApolloClient({
    uri: import.meta.env.VITE_LP_SUBGRAPH_URL,
    cache: new InMemoryCache(),
})

// Query for pool data
const POOL_DATA_QUERY = gql`
    query GetPoolData($id: String!) {
        pool(id: $id) {
            id
            liquidity
            totalValueLockedToken0
            totalValueLockedToken1
            totalValueLockedUSD
            token0 {
                symbol
                decimals
            }
            token1 {
                symbol
                decimals
            }
            token0Price
            token1Price
            tick
            sqrtPrice
        }
    }
`

// Query for user positions
const USER_POSITIONS_QUERY = gql`
    query GetUserPositions($poolId: String!, $owner: String!) {
        positions(where: { 
            pool: $poolId, 
            owner: $owner
        }) {
            id
            liquidity
            depositedToken0
            depositedToken1
            withdrawnToken0
            withdrawnToken1
            tickLower {
                tickIdx
            }
            tickUpper {
                tickIdx
            }
            owner
        }
    }
`

// Define user position type
type UserPosition = {
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

// Define the context type
type LPDataContextType = {
    pool: PoolData | null
    userPositions: UserPosition[] | null
    loading: boolean
    error: any
    account: string | undefined
}

// Define pool data type
type PoolData = {
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

// Create context
const LPDataContext = createContext<LPDataContextType>({
    pool: null,
    userPositions: null,
    loading: false,
    error: null,
    account: undefined
})

// Provider component
export function LPDataProvider({ children }: { children: React.ReactNode }) {
    //const { address: account } = useAccount()
    
    const account = "0xda27d2bdf91a8919b91bdf71f8fd1d2638f9421c"

    console.log('account', account)

    const [pool, setPool] = useState<PoolData | null>(null)
    const [userPositions, setUserPositions] = useState<UserPosition[] | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<any>(null)

    // Fetch pool data
    useEffect(() => {
        const fetchPoolData = async () => {
            try {
                setLoading(true)
                const { data } = await lpClient.query({
                    query: POOL_DATA_QUERY,
                    variables: { id: POOL_ID },
                })

                if (data && data.pool) {
                    setPool(data.pool)
                }
                setLoading(false)
            } catch (err) {
                console.error('Error fetching LP data:', err)
                setError(err)
                setLoading(false)
            }
        }

        fetchPoolData()
        // Set up polling every 5 minutes
        const intervalId = setInterval(fetchPoolData, 5 * 60 * 1000)

        return () => clearInterval(intervalId)
    }, [])

    // Fetch user positions when account changes
    useEffect(() => {
        if (!account) {
            setUserPositions(null)
            return
        }

        const fetchUserPositions = async () => {
            try {
                setLoading(true)
                const { data } = await lpClient.query({
                    query: USER_POSITIONS_QUERY,
                    variables: { 
                        poolId: POOL_ID,
                        owner: account.toLowerCase()
                    },
                })
                
                if (data && data.positions) {
                    setUserPositions(data.positions)
                    console.log('User positions:', data.positions)
                }
                setLoading(false)
            } catch (err) {
                console.error('Error fetching user positions:', err)
                setError(err)
                setLoading(false)
            }
        }

        fetchUserPositions()
        // Set up polling every 5 minutes
        const intervalId = setInterval(fetchUserPositions, 5 * 60 * 1000)
        
        return () => clearInterval(intervalId)
    }, [account])

    return <LPDataContext.Provider value={{ 
        pool, 
        userPositions, 
        loading, 
        error,
        account
    }}>{children}</LPDataContext.Provider>
}

// Hook to use the LP data
export function useLPData() {
    const context = useContext(LPDataContext)
    if (context === undefined) {
        throw new Error('useLPData must be used within a LPDataProvider')
    }
    return context
}

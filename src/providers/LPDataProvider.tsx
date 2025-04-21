import React, { createContext, useContext, useEffect, useState } from 'react'
import { ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client'
import { NETWORK_ID, VITE_GRAPH_API_KEY } from '~/utils'
import { useAccount } from 'wagmi'
import { Position, FeeAmount, Pool, computePoolAddress } from '@uniswap/v3-sdk'
import { CurrencyAmount, Token, Fraction, Price } from '@uniswap/sdk-core'
import { TickMath, SqrtPriceMath } from '@uniswap/v3-sdk'
import JSBI from 'jsbi'

// Pool ID from the subgraph
const POOL_ID = '0x146b020399769339509c98b7b353d19130c150ec'

const subgraphDefaultUrl =
    'https://gateway-arbitrum.network.thegraph.com/api/617040e8f75ef522349d70c034f124f2/subgraphs/id/7SVwgBfXoWmiK6x1NF1VEo1szkeWLniqWN1oYsX3UMb5'

// Create the LP client based on env variable
const lpClient = new ApolloClient({
    uri: import.meta.env.VITE_LP_SUBGRAPH_URL ? import.meta.env.VITE_LP_SUBGRAPH_URL : subgraphDefaultUrl,
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
        positions(where: { pool: $poolId, owner: $owner }) {
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

// Define current user position type
type CurrentUserPosition = {
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

// Define the context type
type LPDataContextType = {
    pool: PoolData | null
    userPositions: UserPosition[] | null
    userCurrentPositionComposition: CurrentUserPosition[] | null
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
    userCurrentPositionComposition: null,
    loading: false,
    error: null,
    account: undefined,
})

/**
 * Transforms the initial position data from subgraph to current position composition
 * @param position The position data from subgraph
 * @param currentTick The current tick of the pool
 * @param sqrtPrice The current sqrtPrice of the pool
 * @param token0Decimals Decimals of token0
 * @param token1Decimals Decimals of token1
 * @returns CurrentUserPosition with updated token amounts
 */
export function initialPositionToCurrent(
    position: UserPosition,
    currentTick: number,
    sqrtPrice: string,
    token0Decimals: number,
    token1Decimals: number
): CurrentUserPosition {
    // Convert position data to numbers
    const liquidity = position.liquidity
    const tickLower = parseInt(position.tickLower.tickIdx)
    const tickUpper = parseInt(position.tickUpper.tickIdx)

    // Calculate current token amounts based on current tick and sqrtPrice
    const { amount0, amount1 } = calculateCurrentAmounts(
        liquidity,
        tickLower,
        tickUpper,
        currentTick,
        sqrtPrice,
        token0Decimals,
        token1Decimals
    )

    // Return the new position with current token amounts
    return {
        id: position.id,
        liquidity: position.liquidity,
        currentToken0: amount0,
        currentToken1: amount1,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        owner: position.owner,
    }
}

/**
 * Calculates the current amounts of token0 and token1 in a position using Uniswap SDK
 */
function calculateCurrentAmounts(
    liquidity: string,
    tickLower: number,
    tickUpper: number,
    currentTick: number,
    sqrtPriceX96: string,
    token0Decimals: number,
    token1Decimals: number
): { amount0: string; amount1: string } {
    try {
        // Ensure decimals are valid numbers between 0-18
        const validToken0Decimals =
            typeof token0Decimals === 'number' && !isNaN(token0Decimals)
                ? Math.min(Math.max(0, Math.floor(token0Decimals)), 18)
                : 18
        const validToken1Decimals =
            typeof token1Decimals === 'number' && !isNaN(token1Decimals)
                ? Math.min(Math.max(0, Math.floor(token1Decimals)), 18)
                : 18

        // Create placeholder tokens - we only need decimals
        const token0 = new Token(NETWORK_ID, '0x10398abc267496e49106b07dd6be13364d10dc71', validToken0Decimals)
        const token1 = new Token(NETWORK_ID, '0x4200000000000000000000000000000000000006', validToken1Decimals)

        // Convert liquidity to JSBI (JavaScript BigInt implementation used by Uniswap SDK)
        const jsbiLiquidity = JSBI.BigInt(liquidity)

        // Convert sqrtPriceX96 to JSBI
        const sqrtPriceX96JSBI = JSBI.BigInt(sqrtPriceX96)

        // Create a Pool instance
        const pool = new Pool(
            token0,
            token1,
            FeeAmount.MEDIUM,
            sqrtPriceX96JSBI,
            JSBI.BigInt(0), // Liquidity - not important for our calculation
            currentTick
        )

        // Create Position instance using the pool
        const position = new Position({
            pool,
            tickLower,
            tickUpper,
            liquidity: jsbiLiquidity,
        })

        // Get amounts
        const amount0Raw = position.amount0
        const amount1Raw = position.amount1

        // Format amounts as human readable with commas
        const formatWithCommas = (value: string): string => {
            const parts = value.split('.')
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            return parts.join('.')
        }

        // Get human readable values with proper decimals and commas
        const amount0Human = formatWithCommas(amount0Raw.toSignificant(6))
        const amount1Human = formatWithCommas(amount1Raw.toSignificant(6))

        return {
            amount0: amount0Raw.toFixed(validToken0Decimals),
            amount1: amount1Raw.toFixed(validToken1Decimals),
        }
    } catch (error) {
        console.error('Error calculating position amounts:', error)
        return {
            amount0: '0',
            amount1: '0',
        }
    }
}

// Provider component
export function LPDataProvider({ children }: { children: React.ReactNode }) {
    const { address: account } = useAccount()

    //const account = '0x328cace41eadf6df6e693b8e4810bf97aac4f5ee'
    const [pool, setPool] = useState<PoolData | null>(null)
    const [userPositions, setUserPositions] = useState<UserPosition[] | null>(null)
    const [userCurrentPositionComposition, setUserCurrentPositionComposition] = useState<CurrentUserPosition[] | null>(
        null
    )
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<any>(null)

    // Fetch pool data
    useEffect(() => {
        const fetchPoolData = async () => {
            try {
                setLoading(true)
                const result = await lpClient.query({
                    query: POOL_DATA_QUERY,
                    variables: { id: POOL_ID },
                })

                const { data } = result

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
                const result = await lpClient.query({
                    query: USER_POSITIONS_QUERY,
                    variables: {
                        poolId: POOL_ID,
                        owner: account.toLowerCase(),
                    },
                })

                const { data } = result

                if (data && data.positions) {
                    setUserPositions(data.positions)
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

    // Calculate current position composition when pool or positions change
    useEffect(() => {
        if (!userPositions || !pool || userPositions.length === 0) {
            setUserCurrentPositionComposition(null)
            return
        }

        try {
            const currentTick = parseInt(pool.tick)
            const currentPositions = userPositions.map((position) =>
                initialPositionToCurrent(
                    position,
                    currentTick,
                    pool.sqrtPrice,
                    pool.token0.decimals,
                    pool.token1.decimals
                )
            )

            setUserCurrentPositionComposition(currentPositions)
        } catch (err) {
            console.error('Error calculating current positions:', err)
            setError(err)
        }
    }, [userPositions, pool])

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

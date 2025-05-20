import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { NETWORK_ID } from '~/utils'
import { Position, FeeAmount, Pool } from '@uniswap/v3-sdk'
import { Token } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import type { PoolData, UserPosition, CurrentUserPosition } from '~/model/lpDataModel'
import { calculatePositionValue } from '~/utils/uniswapV3'

// Pool ID from the subgraph
export const POOL_ID = '0x146b020399769339509c98b7b353d19130c150ec'

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
                id
            }
            token1 {
                symbol
                decimals
                id
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
        positions(first: 1000, where: { pool: $poolId, owner: $owner }) {
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

// Query for all active positions
const ALL_ACTIVE_POSITIONS_QUERY = gql`
    query GetAllActivePositions($poolId: String!) {
        positions(first: 1000, where: { pool: $poolId, liquidity_gt: "0" }) {
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

/**
 * Transforms the initial position data from subgraph to current position composition
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
 * Fetches pool data from the subgraph
 */
export async function fetchPoolData(): Promise<PoolData | null> {
    try {
        const result = await lpClient.query({
            query: POOL_DATA_QUERY,
            variables: { id: POOL_ID },
        })

        const { data } = result

        if (data && data.pool) {
            return data.pool
        }
        return null
    } catch (err) {
        console.error('Error fetching LP data:', err)
        throw err
    }
}

/**
 * Fetches user positions from the subgraph
 * @deprecated Use fetchAllActivePositions and filter by user instead
 */
export async function fetchUserPositions(owner: string): Promise<UserPosition[] | null> {
    try {
        // First fetch pool data
        // const poolResult = await lpClient.query({
        //     query: POOL_DATA_QUERY,
        //     variables: {
        //         id: POOL_ID,
        //     },
        // })

        // Then fetch user positions
        const positionsResult = await lpClient.query({
            query: USER_POSITIONS_QUERY,
            variables: {
                poolId: POOL_ID,
                owner,
            },
        })

        // const { data: poolData } = poolResult
        const { data: positionsData } = positionsResult

        return positionsData.positions
    } catch (err) {
        console.error('Error fetching user positions:', err)
        throw err
    }
}

/**
 * Fetches all active positions from the subgraph (with liquidity > 0)
 */
export async function fetchAllActivePositions(): Promise<UserPosition[] | null> {
    try {
        const poolResult = await lpClient.query({
            query: POOL_DATA_QUERY,
            variables: {
                id: POOL_ID,
            },
        })

        const { data: poolData } = poolResult

        const result = await lpClient.query({
            query: ALL_ACTIVE_POSITIONS_QUERY,
            variables: {
                poolId: POOL_ID,
            },
        })

        const filteredPositions = result.data.positions.filter((position: any) => {
            const inRange =
                Number(position.tickLower.tickIdx) <= Number(poolData.pool.tick) &&
                Number(poolData.pool.tick) < Number(position.tickUpper.tickIdx)
            return inRange ? position : null
        })

        if (filteredPositions) {
            return filteredPositions
        }
        return null
    } catch (err) {
        console.error('Error fetching all active positions:', err)
        throw err
    }
}

/**
 * Calculates current position compositions based on pool and user positions
 */
export function calculateCurrentPositionComposition(
    userPositions: UserPosition[],
    pool: PoolData
): CurrentUserPosition[] | null {
    if (!userPositions || !pool || userPositions.length === 0) {
        return null
    }

    try {
        const currentTick = parseInt(pool.tick)
        return userPositions.map((position) =>
            initialPositionToCurrent(position, currentTick, pool.sqrtPrice, pool.token0.decimals, pool.token1.decimals)
        )
    } catch (err) {
        console.error('Error calculating current positions:', err)
        throw err
    }
}

/**
 * Groups positions by user address
 */
export function groupPositionsByUser(positions: UserPosition[]): Record<string, UserPosition[]> {
    return positions.reduce((grouped, position) => {
        const owner = position.owner.toLowerCase()
        if (!grouped[owner]) {
            grouped[owner] = []
        }
        grouped[owner].push(position)
        return grouped
    }, {} as Record<string, UserPosition[]>)
}

/**
 * Gets positions for a specific user from all positions
 */
export function getUserPositionsFromAll(allPositions: UserPosition[], userAddress: string): UserPosition[] {
    if (!userAddress) return []
    const address = userAddress.toLowerCase()
    return allPositions.filter((position) => position.owner.toLowerCase() === address)
}

/**
 * Calculates the USD value of a position
 */
export function calculatePositionValueInUSD(
    position: UserPosition | CurrentUserPosition,
    pool: PoolData,
    token0UsdPrice: number,
    token1UsdPrice: number
): number {
    try {
        return calculatePositionValue(position, pool, token0UsdPrice, token1UsdPrice)
    } catch (error) {
        console.error('Error calculating position value:', error)
        return 0
    }
}

/**
 * Calculates the total USD value of all positions for a user
 */
export function calculateUserPositionsValue(
    positions: (UserPosition | CurrentUserPosition)[],
    pool: PoolData,
    token0UsdPrice: number,
    token1UsdPrice: number
): number {
    if (!positions || positions.length === 0 || !pool) return 0

    return positions.reduce((total, position) => {
        const positionValue = calculatePositionValueInUSD(position, pool, token0UsdPrice, token1UsdPrice)
        return total + positionValue
    }, 0)
}

/**
 * Calculate position values for all users
 */
export function calculateAllUserPositionValues(
    userPositionsMap: Record<string, UserPosition[]>,
    pool: PoolData,
    token0UsdPrice: number,
    token1UsdPrice: number
): Record<string, number> {
    const result: Record<string, number> = {}

    for (const [userAddress, positions] of Object.entries(userPositionsMap)) {
        result[userAddress] = calculateUserPositionsValue(positions, pool, token0UsdPrice, token1UsdPrice)
    }

    return result
}

/**
 * Calculate total liquidity provided by a user
 */
export function calculateUserTotalLiquidity(positions: UserPosition[]): string {
    if (!positions || positions.length === 0) return '0'

    return positions
        .reduce((sum, position) => {
            return sum + Number(position.liquidity)
        }, 0)
        .toString()
}

/**
 * Calculate total liquidity for all users
 */
export function calculateAllUserTotalLiquidity(
    userPositionsMap: Record<string, UserPosition[]>
): Record<string, string> {
    const result: Record<string, string> = {}

    for (const [userAddress, positions] of Object.entries(userPositionsMap)) {
        result[userAddress] = calculateUserTotalLiquidity(positions)
    }

    return result
}

import { NETWORK_ID } from '~/utils'
import { Position, FeeAmount, Pool } from '@uniswap/v3-sdk'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import JSBI from 'jsbi'

/**
 * Utility functions for Uniswap V3 position calculations
 */

/**
 * Calculate token amounts for a Uniswap V3 position
 */
export function calculateAmounts(
    liquidity: number,
    tickLower: number,
    tickUpper: number,
    currentTick: number,
    sqrtPrice: number
) {
    // Scale down the liquidity to avoid numerical overflows
    // Uniswap liquidity values are often very large
    const scaledLiquidity = liquidity / 1e18

    // Convert tick indices to sqrt prices
    const sqrtPriceLower = Math.sqrt(1.0001 ** tickLower)
    const sqrtPriceUpper = Math.sqrt(1.0001 ** tickUpper)

    // Note: sqrtPrice from the API is already in the right format, no need for Q64.96 conversion
    // which was causing massive numerical errors
    const currentSqrtPrice = parseFloat(sqrtPrice.toString())

    let amount0 = 0
    let amount1 = 0

    if (currentTick <= tickLower) {
        // Position is entirely token0
        amount0 = scaledLiquidity * (1 / sqrtPriceLower - 1 / sqrtPriceUpper)
    } else if (currentTick >= tickUpper) {
        // Position is entirely token1
        amount1 = scaledLiquidity * (sqrtPriceUpper - sqrtPriceLower)
    } else {
        // Position contains both tokens
        amount0 = scaledLiquidity * (1 / currentSqrtPrice - 1 / sqrtPriceUpper)
        amount1 = scaledLiquidity * (currentSqrtPrice - sqrtPriceLower)
    }

    return { amount0, amount1 }
}

/**
 * Calculate the USD value of a position based on token amounts and prices
 */
export function calculateUSDValue(amount0: number, amount1: number, token0UsdPrice: number, token1UsdPrice: number) {
    // Ensure prices are reasonable (fallback to 1.0 if crazy values)
    const safeToken0Price =
        isFinite(token0UsdPrice) && token0UsdPrice > 0 && token0UsdPrice < 1000000 ? token0UsdPrice : 1.0

    const safeToken1Price =
        isFinite(token1UsdPrice) && token1UsdPrice > 0 && token1UsdPrice < 1000000 ? token1UsdPrice : 1.0

    return amount0 * safeToken0Price + amount1 * safeToken1Price
}

function calculateCurrentAmounts(
    liquidity: string,
    tickLower: number,
    tickUpper: number,
    currentTick: number,
    sqrtPriceX96: string,
    token0Decimals: number,
    token1Decimals: number
): { amount0: CurrencyAmount<Token> | string; amount1: CurrencyAmount<Token> | string } {
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
            amount0: amount0Raw,
            amount1: amount1Raw,
        }
    } catch (error) {
        console.error('Error calculating position amounts:', error)
        throw new Error('Error calculating position amounts')
    }
}

// Keep the old function for compatibility
export function calculatePositionValue(
    position: {
        liquidity: string
        tickLower: { tickIdx: string }
        tickUpper: { tickIdx: string }
    },
    pool: {
        tick: string
        sqrtPrice: string
        token0Price: string
        token1Price: string
        totalValueLockedUSD: string
        liquidity: string
    },
    token0UsdPrice: number,
    token1UsdPrice: number
) {
    if (!position || !pool) return 0

    // Convert string values to numbers
    const liquidity = position.liquidity
    const tickLower = parseInt(position.tickLower.tickIdx)
    const tickUpper = parseInt(position.tickUpper.tickIdx)
    const currentTick = parseInt(pool.tick)
    const sqrtPrice = pool.sqrtPrice

    if (parseFloat(liquidity) === 0) return 0

    try {
        // Calculate current token amounts using the SDK-based function
        // Assuming default decimals of 18 for both tokens
        const { amount0: amount0Raw, amount1: amount1Raw } = calculateCurrentAmounts(
            liquidity,
            tickLower,
            tickUpper,
            currentTick,
            sqrtPrice,
            18, // token0Decimals - using default of 18
            18 // token1Decimals - using default of 18
        )

        // Convert CurrencyAmount objects to numbers for USD calculation
        let amount0 = 0
        let amount1 = 0

        if (typeof amount0Raw === 'string') {
            amount0 = parseFloat(amount0Raw)
        } else {
            amount0 = parseFloat(amount0Raw.toFixed(6))
        }

        if (typeof amount1Raw === 'string') {
            amount1 = parseFloat(amount1Raw)
        } else {
            amount1 = parseFloat(amount1Raw.toFixed(6))
        }

        // Calculate USD value
        const value = calculateUSDValue(amount0, amount1, token0UsdPrice, token1UsdPrice)

        // Apply a sanity check - if value is unreasonably large, return a modest estimate
        if (!isFinite(value) || value > 1000000000) {
            // Fallback to a simple proportion of pool TVL as a reasonable approximation
            const poolTVL = parseFloat(pool.totalValueLockedUSD)
            const poolLiquidity = parseFloat(pool.liquidity)
            if (poolLiquidity > 0 && isFinite(poolTVL)) {
                return (parseFloat(liquidity) / poolLiquidity) * poolTVL
            }
            return 0
        }

        return value
    } catch (error) {
        console.error('Error calculating position value:', error)
        return 0
    }
}

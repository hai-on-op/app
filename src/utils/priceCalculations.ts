import { formatUnits } from 'ethers/lib/utils'
import { stringsExistAndAreEqual } from '~/utils'
import { TOKEN_ADDRESSES } from '~/utils/constants'

// Types duplicated for this utility
interface TokenData {
    address: string
    symbol: string
    [key: string]: any
}

interface PoolData {
    address: string
    token0: string
    token1: string
    decimals: number
    reserve0: string
    reserve1: string
    staked0: string
    staked1: string
    tokenPair: [string, string]
    [key: string]: any
}

interface VelodromePricesData {
    [tokenSymbol: string]: {
        raw: string
        toString(): string
    }
}

/**
 * Calculate the price of a token from velodrome price data
 */
export function calculateTokenPrice(tokenSymbol: string, velodromePricesData: VelodromePricesData): number {
    return parseFloat(
        velodromePricesData[tokenSymbol]?.raw || 
        velodromePricesData[tokenSymbol]?.toString() || 
        '1'
    )
}

/**
 * Get token symbol from address using tokensData with fallback
 */
export function getTokenSymbol(
    tokenAddress: string, 
    tokensData: Record<string, TokenData>, 
    fallbackSymbol: string
): string {
    return Object.values(tokensData).find(({ address }) => 
        stringsExistAndAreEqual(address, tokenAddress)
    )?.symbol || fallbackSymbol
}

/**
 * Calculate pool TVL for both tokens in a Velodrome pool
 */
export function calculatePoolTVL(
    pool: PoolData, 
    tokensData: Record<string, TokenData>, 
    velodromePricesData: VelodromePricesData
): { tvl0: number; tvl1: number; totalTvl: number } {
    // Get token symbols
    const token0 = getTokenSymbol(pool.token0, tokensData, pool.tokenPair[0])
    const token1 = getTokenSymbol(pool.token1, tokensData, pool.tokenPair[1])
    
    // Get token prices
    const price0 = calculateTokenPrice(token0, velodromePricesData)
    const price1 = calculateTokenPrice(token1, velodromePricesData)
    
    // Determine which balance to use (reserve vs staked) based on ALUSD presence
    const base0 = (pool.token0 === TOKEN_ADDRESSES.ALUSD || pool.token1 === TOKEN_ADDRESSES.ALUSD) 
        ? pool.reserve0 
        : pool.staked0
    const base1 = (pool.token1 === TOKEN_ADDRESSES.ALUSD || pool.token0 === TOKEN_ADDRESSES.ALUSD) 
        ? pool.reserve1 
        : pool.staked1
    
    // Calculate TVL for each token
    const tvl0 = parseFloat(formatUnits(base0, pool.decimals)) * price0
    const tvl1 = parseFloat(formatUnits(base1, pool.decimals)) * price1
    const totalTvl = tvl0 + tvl1
    
    return {
        tvl0,
        tvl1,
        totalTvl
    }
} 
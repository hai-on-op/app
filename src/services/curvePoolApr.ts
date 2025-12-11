import { Contract, BigNumber } from 'ethers'
import type { Provider } from '@ethersproject/providers'
import type { Address } from '~/types/stakingConfig'

/**
 * Minimal ABI for Curve StableSwap pool to fetch virtual price
 */
const CURVE_POOL_ABI = [
    'function get_virtual_price() view returns (uint256)',
    'function fee() view returns (uint256)',
    'function A() view returns (uint256)',
]

export type CurvePoolAprResult = {
    virtualPrice: number
    virtualPriceRaw: string
    vApy: number // As decimal (e.g., 0.05 for 5%)
    lpPriceUsd: number
    poolTvlUsd: number
}

type CurveSubgraphPoolData = {
    address?: string
    virtualPrice?: string | number
    rawVolume?: string | number
    volumeUSD?: string | number
    latestDailyApy?: string | number
    latestWeeklyApy?: string | number
}

type CurveSubgraphResponse = {
    success?: boolean
    data?: {
        poolList?: CurveSubgraphPoolData[]
    }
}

const CURVE_SUBGRAPH_ENDPOINT = 'https://api.curve.finance/api/getSubgraphData/optimism'

/**
 * Fetch subgraph data from Curve API which may include APY information
 */
async function fetchCurveSubgraphData(): Promise<CurveSubgraphPoolData[]> {
    try {
        const response = await fetch(CURVE_SUBGRAPH_ENDPOINT)
        if (!response.ok) {
            console.warn(`Curve subgraph API responded with HTTP ${response.status}`)
            return []
        }
        const json = (await response.json()) as CurveSubgraphResponse
        return json?.data?.poolList || []
    } catch (error) {
        console.warn('Failed to fetch Curve subgraph data:', error)
        return []
    }
}

/**
 * Find pool data by address in the subgraph response
 */
function findPoolInSubgraph(pools: CurveSubgraphPoolData[], poolAddress: Address): CurveSubgraphPoolData | undefined {
    const target = poolAddress.toLowerCase()
    return pools.find((p) => p.address?.toLowerCase() === target)
}

/**
 * Fetch the current virtual price directly from the Curve pool contract.
 * Virtual price is scaled by 1e18.
 */
export async function fetchVirtualPriceFromContract(
    poolAddress: Address,
    provider: Provider
): Promise<{ virtualPrice: number; virtualPriceRaw: string } | null> {
    try {
        const pool = new Contract(poolAddress, CURVE_POOL_ABI, provider)
        const virtualPriceBn: BigNumber = await pool.get_virtual_price()
        const virtualPriceRaw = virtualPriceBn.toString()
        // Virtual price is scaled by 1e18
        const virtualPrice = Number(virtualPriceRaw) / 1e18

        console.log(`[CurvePoolApr] Virtual price from contract: ${virtualPrice}`)
        console.log(`[CurvePoolApr] Virtual price raw: ${virtualPriceRaw}`)

        return { virtualPrice, virtualPriceRaw }
    } catch (error) {
        console.error('[CurvePoolApr] Failed to fetch virtual price from contract:', error)
        return null
    }
}

/**
 * Calculate the base vAPY for a Curve pool.
 * 
 * Per Curve documentation (https://resources.curve.finance/pools/calculating-yield/#base-vapy):
 * vAPY = (virtual_price(today) / virtual_price(yesterday))^365 - 1
 * 
 * Since we don't have easy access to yesterday's virtual price, we:
 * 1. First try to get APY from Curve's subgraph data (latestDailyApy or latestWeeklyApy)
 * 2. Fall back to 0% if no data is available
 * 
 * For stablecoin pools, the base vAPY from trading fees is typically 0.1%-2% range.
 */
export async function fetchCurvePoolApr(
    poolAddress: Address,
    provider: Provider,
    lpPriceUsd?: number,
    poolTvlUsd?: number
): Promise<CurvePoolAprResult | null> {
    try {
        // 1. Fetch current virtual price from contract
        const vpResult = await fetchVirtualPriceFromContract(poolAddress, provider)
        if (!vpResult) {
            return null
        }

        const { virtualPrice, virtualPriceRaw } = vpResult

        // 2. Try to get APY from Curve subgraph
        let vApy = 0
        try {
            const subgraphPools = await fetchCurveSubgraphData()
            const poolData = findPoolInSubgraph(subgraphPools, poolAddress)

            if (poolData) {
                // Try latestDailyApy first, then latestWeeklyApy
                const dailyApy = poolData.latestDailyApy
                const weeklyApy = poolData.latestWeeklyApy

                if (dailyApy != null && Number(dailyApy) > 0) {
                    // Curve API returns APY as percentage (e.g., 1.5 for 1.5%)
                    vApy = Number(dailyApy) / 100
                    console.log(`[CurvePoolApr] Using daily APY from subgraph: ${Number(dailyApy)}%`)
                } else if (weeklyApy != null && Number(weeklyApy) > 0) {
                    vApy = Number(weeklyApy) / 100
                    console.log(`[CurvePoolApr] Using weekly APY from subgraph: ${Number(weeklyApy)}%`)
                } else {
                    console.log('[CurvePoolApr] No APY data in subgraph, using 0%')
                }
            } else {
                console.log('[CurvePoolApr] Pool not found in subgraph data')
            }
        } catch (error) {
            console.warn('[CurvePoolApr] Error fetching subgraph data:', error)
        }

        // Log the calculated values
        console.log(`[CurvePoolApr] Pool: ${poolAddress}`)
        console.log(`[CurvePoolApr] Virtual Price: ${virtualPrice}`)
        console.log(`[CurvePoolApr] Base vAPY: ${(vApy * 100).toFixed(4)}%`)
        if (lpPriceUsd) {
            console.log(`[CurvePoolApr] LP Price USD: $${lpPriceUsd.toFixed(4)}`)
        }
        if (poolTvlUsd) {
            console.log(`[CurvePoolApr] Pool TVL USD: $${poolTvlUsd.toFixed(2)}`)
        }

        return {
            virtualPrice,
            virtualPriceRaw,
            vApy,
            lpPriceUsd: lpPriceUsd ?? 0,
            poolTvlUsd: poolTvlUsd ?? 0,
        }
    } catch (error) {
        console.error('[CurvePoolApr] Error calculating pool APR:', error)
        return null
    }
}

/**
 * Calculate KITE staking incentives APR for LP staking.
 * 
 * Formula: incentivesApr = (dailyKiteReward * 365 * kitePrice) / totalStakedValueUsd
 */
export function calculateKiteIncentivesApr(params: {
    dailyKiteReward: number
    kitePrice: number
    totalStakedValueUsd: number
}): number {
    const { dailyKiteReward, kitePrice, totalStakedValueUsd } = params

    if (totalStakedValueUsd <= 0 || kitePrice <= 0) {
        console.log('[CurvePoolApr] Cannot calculate KITE incentives APR - missing data')
        console.log(`[CurvePoolApr]   dailyKiteReward: ${dailyKiteReward}`)
        console.log(`[CurvePoolApr]   kitePrice: $${kitePrice}`)
        console.log(`[CurvePoolApr]   totalStakedValueUsd: $${totalStakedValueUsd}`)
        return 0
    }

    const annualKiteRewardUsd = dailyKiteReward * 365 * kitePrice
    const incentivesApr = annualKiteRewardUsd / totalStakedValueUsd

    console.log(`[CurvePoolApr] KITE Incentives APR Calculation:`)
    console.log(`[CurvePoolApr]   Daily KITE reward: ${dailyKiteReward} KITE`)
    console.log(`[CurvePoolApr]   KITE price: $${kitePrice.toFixed(4)}`)
    console.log(`[CurvePoolApr]   Annual reward value: $${annualKiteRewardUsd.toFixed(2)}`)
    console.log(`[CurvePoolApr]   Total staked value: $${totalStakedValueUsd.toFixed(2)}`)
    console.log(`[CurvePoolApr]   KITE Incentives APR: ${(incentivesApr * 100).toFixed(2)}%`)

    return incentivesApr
}


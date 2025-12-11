import type { Address } from '~/types/stakingConfig'

export type CurveLpTvlResult = {
    tvlUsd: number
    lpPriceUsd: number
}

type CurvePoolData = {
    name?: string
    address?: string
    lpTokenAddress?: string
    usdTotal?: string | number
    usdTotalExcludingBasePool?: string | number
    usdTotalLiquidity?: string | number
    virtualPrice?: string | number
    lpTokenPrice?: string | number
    totalSupply?: string | number
}

type CurvePoolsResponse = {
    success?: boolean
    data?: {
        poolData?: CurvePoolData[]
    }
}

const CURVE_OPTIMISM_POOLS_ENDPOINT =
    'https://api.curve.finance/api/getPools/optimism/factory-stable-ng'

function toNumber(value: string | number | undefined): number | null {
    if (value == null) return null
    const num = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(num) || Number.isNaN(num) || num < 0) return null
    return num
}

function pickFirstNumber(...values: Array<string | number | undefined>): number | null {
    for (const value of values) {
        const num = toNumber(value)
        if (num != null) {
            return num
        }
    }
    return null
}

/**
 * Fetch all Curve factory-stable-ng pools on Optimism from Curve's public API.
 *
 * This is a thin, typed wrapper around:
 *   GET https://api.curve.finance/api/getPools/optimism/factory-stable-ng
 */
async function fetchCurveOptimismPools(): Promise<CurvePoolData[]> {
    const response = await fetch(CURVE_OPTIMISM_POOLS_ENDPOINT)
    if (!response.ok) {
        throw new Error(`Curve API responded with HTTP ${response.status}`)
    }

    const json = (await response.json()) as CurvePoolsResponse
    if (!json?.data?.poolData || !Array.isArray(json.data.poolData)) {
        throw new Error('Curve API response missing poolData')
    }

    return json.data.poolData
}

/**
 * Locate the HAI/BOLD Curve pool (or any other LP) in Curve's pool list.
 *
 * For robustness we:
 *  - Prefer matching the LP token / pool address (case-insensitive)
 *  - Fallback to matching by pool name containing both "HAI" and "BOLD"
 */
function findCurvePoolForLpToken(pools: CurvePoolData[], lpTokenAddress: Address): CurvePoolData | undefined {
    const target = lpTokenAddress.toLowerCase()

    const byAddress = pools.find((pool) => {
        const poolAddr = typeof pool.address === 'string' ? pool.address.toLowerCase() : ''
        const lpAddr = typeof pool.lpTokenAddress === 'string' ? pool.lpTokenAddress.toLowerCase() : ''
        return poolAddr === target || lpAddr === target
    })
    if (byAddress) return byAddress

    // Heuristic fallback: match by name containing both HAI and BOLD
    return pools.find((pool) => {
        if (!pool.name) return false
        const upper = pool.name.toUpperCase()
        return upper.includes('HAI') && upper.includes('BOLD')
    })
}

/**
 * Resolve TVL (USD) and LP price (USD) for a specific Curve LP token on Optimism.
 *
 * For now this is tailored to HAI/BOLD, but it is generic over the LP token address.
 * It relies on Curve's public API fields:
 *  - usdTotal / usdTotalLiquidity → TVL in USD
 *  - lpTokenPrice or virtualPrice → price of one LP token in USD (or a close proxy)
 */
export async function fetchCurveLpTvlForOptimismLp(lpTokenAddress: Address): Promise<CurveLpTvlResult | null> {
    try {
        const pools = await fetchCurveOptimismPools()
        const pool = findCurvePoolForLpToken(pools, lpTokenAddress)
        if (!pool) {
            return null
        }

        const tvlUsd = pickFirstNumber(
            pool.usdTotal,
            pool.usdTotalExcludingBasePool,
            pool.usdTotalLiquidity
        )
        if (tvlUsd == null) {
            return null
        }

        let lpPriceUsd = pickFirstNumber(pool.lpTokenPrice)

        // Derive LP price from TVL and total supply when possible (most accurate).
        if (lpPriceUsd == null) {
            const totalSupplyRaw = toNumber(pool.totalSupply)
            if (totalSupplyRaw != null && totalSupplyRaw > 0) {
                const supplyNormalized = totalSupplyRaw / 1e18
                const perLp = tvlUsd / supplyNormalized
                if (Number.isFinite(perLp) && perLp > 0) {
                    lpPriceUsd = perLp
                }
            }
        }

        // As a final fallback, approximate from virtualPrice (1e18-scaled factor)
        if (lpPriceUsd == null) {
            const virtualPrice = toNumber(pool.virtualPrice)
            if (virtualPrice != null && virtualPrice > 0) {
                lpPriceUsd = virtualPrice / 1e18
            }
        }

        if (lpPriceUsd == null) {
            return {
                tvlUsd,
                lpPriceUsd: 0,
            }
        }

        return {
            tvlUsd,
            lpPriceUsd,
        }
    } catch (error) {
        // Surface a null result to callers; logging can be added at the call site if desired.
        console.error('Failed to fetch Curve LP TVL data', error)
        return null
    }
}



import { BigNumber } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { formatNumberWithStyle } from '~/utils'
import type { LpTvlMetadata, StakingConfig } from '~/types/stakingConfig'
import type { VelodromeLpData } from '~/hooks/useVelodrome'

export type LpTvlValue = {
    usd: number
}

export type LpTvlService = {
    /**
     * Fetches the current TVL (in USD) for the configured LP pool.
     *
     * For now this returns placeholder data; later it will hit Curve/Velodrome endpoints.
     */
    getTvl: () => Promise<LpTvlValue | null>
}

export type LpTvlTokenPriceMap = Record<string, number>

/**
 * Calculate USD TVL for a Velodrome pool using its reserves and per-token USD prices.
 *
 * Assumes 18 decimals for both tokens (which is true for HAI/VELO-style pools).
 */
export function calculateVelodromePoolTvlUsd(
    lp: VelodromeLpData,
    pricesBySymbol: LpTvlTokenPriceMap
): number {
    if (!lp) return 0

    const [symbol0, symbol1] = lp.tokenPair
    const price0 = pricesBySymbol[symbol0] ?? 0
    const price1 = pricesBySymbol[symbol1] ?? 0

    const reserve0 = BigNumber.from(lp.reserve0 ?? 0)
    const reserve1 = BigNumber.from(lp.reserve1 ?? 0)

    if (reserve0.isZero() && reserve1.isZero()) return 0

    // HAI and VELO (and related tokens) use 18 decimals on Optimism.
    const amount0 = parseFloat(formatUnits(reserve0, 18))
    const amount1 = parseFloat(formatUnits(reserve1, 18))

    const tvlUsd = amount0 * price0 + amount1 * price1

    if (!Number.isFinite(tvlUsd) || tvlUsd < 0) {
        return 0
    }

    return tvlUsd
}

/**
 * Build an LP TVL service scoped to a specific staking config.
 *
 * The default implementation returns placeholder values for non‑Velodrome sources.
 * Velodrome pools are handled separately via Sugar + price oracles in hooks.
 */
export function buildLpTvlService(config: StakingConfig): LpTvlService | null {
    const tvlMeta: LpTvlMetadata | undefined = config.tvl
    if (!tvlMeta) return null

    const { source } = tvlMeta

    return {
        async getTvl(): Promise<LpTvlValue | null> {
            // Placeholder TVL values; replace with real Curve / Velodrome API calls later.
            switch (source) {
                case 'curve':
                    return { usd: 2_000_000 }
                case 'velodrome':
                    return { usd: 1_500_000 }
                default:
                    return null
            }
        },
    }
}

export type LpTvlHookResult = {
    loading: boolean
    tvlUsd: number | null
    tvlUsdFormatted: string
}

/**
 * Convenience helper to format a raw TVL value in USD for display.
 */
export function formatLpTvlUsd(value: number | null): string {
    if (value == null || Number.isNaN(value)) {
        return '--'
    }

    return formatNumberWithStyle(value, {
        style: 'currency',
        minDecimals: 0,
        maxDecimals: 0,
    })
}



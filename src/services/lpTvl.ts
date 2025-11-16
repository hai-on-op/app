import { formatNumberWithStyle } from '~/utils'
import type { LpTvlMetadata, StakingConfig } from '~/types/stakingConfig'

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

/**
 * Build an LP TVL service scoped to a specific staking config.
 *
 * The current implementation returns placeholder values based on the TVL source so we can
 * wire the UI and types without depending on live endpoints.
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



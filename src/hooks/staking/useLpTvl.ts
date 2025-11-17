import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { StakingConfig } from '~/types/stakingConfig'
import {
    buildLpTvlService,
    calculateVelodromePoolTvlUsd,
    formatLpTvlUsd,
    type LpTvlHookResult,
    type LpTvlTokenPriceMap,
    type LpTvlValue,
} from '~/services/lpTvl'
import { useVelodrome } from '~/hooks/useVelodrome'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'

export function useLpTvl(config?: StakingConfig): LpTvlHookResult {
    const hasTvlConfig = Boolean(config?.tvl)
    const isVelodrome = config?.tvl?.source === 'velodrome'

    // Velodrome data sources (Sugar + price oracle)
    const { data: velodromePools, loading: poolsLoading } = useVelodrome()
    const { prices: veloPrices, loading: veloPricesLoading } = useVelodromePrices()

    const velodromePricesBySymbol: LpTvlTokenPriceMap = useMemo(() => {
        if (!veloPrices) return {}

        const entries = Object.entries(veloPrices) as [string, { raw: string }][]
        return entries.reduce<LpTvlTokenPriceMap>((acc, [symbol, value]) => {
            const numeric = parseFloat(value.raw)
            if (!Number.isNaN(numeric)) {
                acc[symbol.toUpperCase()] = numeric
            }
            return acc
        }, {})
    }, [veloPrices])

    const velodromePool = useMemo(() => {
        if (!config?.tvl?.poolAddress || !velodromePools?.length) return undefined
        const target = config.tvl.poolAddress.toLowerCase()
        return velodromePools.find((p) => p.address.toLowerCase() === target)
    }, [config?.tvl?.poolAddress, velodromePools])

    const velodromeTvlUsd: number | null = useMemo(() => {
        if (!isVelodrome || !velodromePool) return null
        const tvl = calculateVelodromePoolTvlUsd(velodromePool, velodromePricesBySymbol)
        return tvl === 0 ? null : tvl
    }, [isVelodrome, velodromePool, velodromePricesBySymbol])

    const velodromeLoading = isVelodrome && hasTvlConfig && (poolsLoading || veloPricesLoading)

    // Default (non‑Velodrome) TVL source – currently placeholder, suitable for Curve or others later.
    const { data, isLoading } = useQuery<LpTvlValue | null>({
        queryKey: ['stake', config?.namespace, 'lpTvl'],
        enabled: hasTvlConfig && !isVelodrome,
        queryFn: async () => {
            if (!config) return null

            const service = buildLpTvlService(config)
            if (!service) return null

            return service.getTvl()
        },
        staleTime: 60_000,
    })

    const serviceTvlUsd = data?.usd ?? null
    const tvlUsd = isVelodrome ? velodromeTvlUsd : serviceTvlUsd
    const loading = isVelodrome ? velodromeLoading : isLoading && hasTvlConfig
    const tvlUsdFormatted = formatLpTvlUsd(tvlUsd)

    return {
        loading,
        tvlUsd,
        tvlUsdFormatted,
    }
}

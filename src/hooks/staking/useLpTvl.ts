import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { StakingConfig } from '~/types/stakingConfig'
import {
    buildLpTvlService,
    formatLpTvlUsd,
    type LpTvlHookResult,
    type LpTvlValue,
} from '~/services/lpTvl'
import { calculateVelodromeLpValueFromPool } from '~/services/velodromePoolApr'
import { useVelodrome } from '~/hooks/useVelodrome'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'

export function useLpTvl(config?: StakingConfig): LpTvlHookResult {
    const hasTvlConfig = Boolean(config?.tvl)
    const isVelodrome = config?.tvl?.source === 'velodrome'

    // Velodrome data sources (Sugar + price oracle)
    const { data: velodromePools, loading: poolsLoading } = useVelodrome()
    const { prices: veloPrices, loading: veloPricesLoading } = useVelodromePrices()

    // Get VELO price for LP value calculation
    const veloPrice = Number(veloPrices?.VELO?.raw || 0)

    const velodromePool = useMemo(() => {
        if (!config?.tvl?.poolAddress || !velodromePools?.length) return undefined
        const target = config.tvl.poolAddress.toLowerCase()
        return velodromePools.find((p) => p.address.toLowerCase() === target)
    }, [config?.tvl?.poolAddress, velodromePools])

    // Calculate Velodrome LP value (both TVL and LP price)
    const velodromeLpValue = useMemo(() => {
        if (!isVelodrome || !velodromePool || veloPrice <= 0) return null
        return calculateVelodromeLpValueFromPool(velodromePool, veloPrice)
    }, [isVelodrome, velodromePool, veloPrice])

    const velodromeTvlUsd = velodromeLpValue?.tvlUsd ?? null
    const velodromeLpPriceUsd = velodromeLpValue?.lpPriceUsd ?? null

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
    const serviceLpPriceUsd = data?.lpPriceUsd ?? null
    const tvlUsd = isVelodrome ? velodromeTvlUsd : serviceTvlUsd
    const lpPriceUsd = isVelodrome ? velodromeLpPriceUsd : serviceLpPriceUsd
    const loading = isVelodrome ? velodromeLoading : isLoading && hasTvlConfig
    const tvlUsdFormatted = formatLpTvlUsd(tvlUsd)

    return {
        loading,
        tvlUsd,
        tvlUsdFormatted,
        lpPriceUsd,
    }
}

import { useQuery } from '@tanstack/react-query'
import type { StakingConfig } from '~/types/stakingConfig'
import { buildLpTvlService, formatLpTvlUsd } from '~/services/lpTvl'
import type { LpTvlHookResult, LpTvlValue } from '~/services/lpTvl'

export function useLpTvl(config?: StakingConfig): LpTvlHookResult {
    const enabled = Boolean(config?.tvl)

    const { data, isLoading } = useQuery<LpTvlValue | null>({
        queryKey: ['stake', config?.namespace, 'lpTvl'],
        enabled,
        queryFn: async () => {
            if (!config) return null

            const service = buildLpTvlService(config)
            if (!service) return null

            return service.getTvl()
        },
        staleTime: 60_000,
    })

    const tvlUsd = data?.usd ?? null
    const tvlUsdFormatted = formatLpTvlUsd(tvlUsd)

    return {
        loading: isLoading && enabled,
        tvlUsd,
        tvlUsdFormatted,
    }
}



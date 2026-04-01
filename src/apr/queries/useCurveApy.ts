import { useQuery } from '@tanstack/react-query'
import { usePublicProvider } from '~/hooks'
import { fetchCurvePoolApr } from '~/services/curvePoolApr'
import { fetchCurveLpTvlForOptimismLp } from '~/services/curveLpTvl'

/**
 * React Query wrapper for Curve pool APY + LP price.
 */
export function useCurvePoolData(poolAddress?: string) {
    const provider = usePublicProvider()

    const tvlQuery = useQuery({
        queryKey: ['apr', 'curve', 'tvl', poolAddress],
        enabled: Boolean(poolAddress),
        staleTime: 5 * 60_000,
        queryFn: () => {
            if (!poolAddress) return null
            return fetchCurveLpTvlForOptimismLp(poolAddress as `0x${string}`)
        },
    })

    const aprQuery = useQuery({
        queryKey: ['apr', 'curve', 'apr', poolAddress],
        enabled: Boolean(poolAddress && provider && tvlQuery.data),
        staleTime: 5 * 60_000,
        queryFn: () => {
            if (!poolAddress || !provider) return null
            return fetchCurvePoolApr(poolAddress as `0x${string}`, provider, tvlQuery.data?.lpPriceUsd, tvlQuery.data?.tvlUsd)
        },
    })

    return {
        vApy: aprQuery.data?.vApy ?? 0,
        lpPriceUsd: tvlQuery.data?.lpPriceUsd ?? 0,
        poolTvlUsd: tvlQuery.data?.tvlUsd ?? 0,
        loading: tvlQuery.isLoading || aprQuery.isLoading,
    }
}

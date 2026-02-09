import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchV2Safes } from '~/services/haivelo/dataSources'
import { calculateHaiVeloCollateralMapping } from '~/services/haiVeloService'

export type UseHaiAeroCollateralMappingResult = {
    mapping: Record<string, string>
    isLoading: boolean
    isError: boolean
    error: unknown
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

/**
 * Fetch HAIAERO safes from the Optimism subgraph and build a per-user mapping
 * of deposited haiAERO. Mirrors useHaiVeloCollateralMapping but only needs V2.
 */
export function useHaiAeroCollateralMapping(): UseHaiAeroCollateralMappingResult {
    const {
        data: v2,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ['haiaero', 'mapping', 'v2'],
        queryFn: async () => fetchV2Safes('HAIAERO' as any),
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })

    const mapping = useMemo(() => {
        if (!v2) return {}
        // Reuse the same collateral mapping builder – it's generic (just sums safe.collateral by owner)
        return calculateHaiVeloCollateralMapping({ safes: v2.safes } as any)
    }, [v2])

    return { mapping, isLoading, isError, error }
}

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchV1Safes } from '~/services/haivelo/dataSources'
import { calculateHaiVeloCollateralMapping } from '~/services/haiVeloService'

export type UseHaiVeloCollateralMappingResult = {
    mapping: Record<string, string>
    isLoading: boolean
    isError: boolean
    error: unknown
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export function useHaiVeloCollateralMapping(): UseHaiVeloCollateralMappingResult {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['haivelo', 'mapping', 'v1'],
        queryFn: async () => fetchV1Safes('HAIVELO'),
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })

    const mapping = useMemo(() => {
        if (!data) return {}
        return calculateHaiVeloCollateralMapping({ safes: data.safes } as any)
    }, [data])

    return { mapping, isLoading, isError, error }
}



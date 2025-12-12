import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchV1Safes, fetchV2Safes } from '~/services/haivelo/dataSources'
import { calculateHaiVeloCollateralMapping } from '~/services/haiVeloService'

export type UseHaiVeloCollateralMappingResult = {
    mapping: Record<string, string>
    isLoading: boolean
    isError: boolean
    error: unknown
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export function useHaiVeloCollateralMapping(): UseHaiVeloCollateralMappingResult {
    const {
        data: v1,
        isLoading: l1,
        isError: e1,
        error: err1,
    } = useQuery({
        queryKey: ['haivelo', 'mapping', 'v1'],
        queryFn: async () => fetchV1Safes('HAIVELO'),
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })
    const {
        data: v2,
        isLoading: l2,
        isError: e2,
        error: err2,
    } = useQuery({
        queryKey: ['haivelo', 'mapping', 'v2'],
        queryFn: async () => fetchV2Safes('HAIVELOV2'),
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })

    const mapping = useMemo(() => {
        const m1 = v1 ? calculateHaiVeloCollateralMapping({ safes: v1.safes } as any) : {}
        const m2 = v2 ? calculateHaiVeloCollateralMapping({ safes: v2.safes } as any) : {}
        const combined: Record<string, string> = { ...m1 }
        Object.entries(m2).forEach(([addr, amt]) => {
            combined[addr] = (Number(combined[addr] || '0') + Number(amt)).toString()
        })
        return combined
    }, [v1, v2])

    return { mapping, isLoading: l1 || l2, isError: e1 || e2, error: err1 || err2 }
}

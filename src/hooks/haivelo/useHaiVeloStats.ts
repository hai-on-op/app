import { useQuery } from '@tanstack/react-query'
import { fetchV1Safes, fetchV2Totals } from '~/services/haivelo/dataSources'

export type HaiVeloStatsVersion = {
    totalDeposited: string // raw units (as number-string)
    tvlUsd: number
}

export type HaiVeloStatsCombined = {
    totalDeposited: string
    tvlUsd: number
}

export type UseHaiVeloStatsResult = {
    v1: HaiVeloStatsVersion
    v2: HaiVeloStatsVersion
    combined: HaiVeloStatsCombined
    isLoading: boolean
    isError: boolean
    error: unknown
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export function useHaiVeloStats(haiVeloPriceUsd = 0): UseHaiVeloStatsResult {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['haivelo', 'stats'],
        queryFn: async () => {
            const [v1, v2] = await Promise.all([fetchV1Safes('HAIVELO'), fetchV2Totals()])
            const v1Total = Number(v1.totalCollateral || '0')
            const v2Total = Number(v2.totalSupplyFormatted || '0')
            const v1Usd = v1Total * haiVeloPriceUsd
            const v2Usd = v2Total * haiVeloPriceUsd
            return {
                v1: { totalDeposited: String(v1Total), tvlUsd: v1Usd },
                v2: { totalDeposited: String(v2Total), tvlUsd: v2Usd },
                combined: { totalDeposited: String(v1Total + v2Total), tvlUsd: v1Usd + v2Usd },
            }
        },
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })

    return {
        v1: data?.v1 || { totalDeposited: '0', tvlUsd: 0 },
        v2: data?.v2 || { totalDeposited: '0', tvlUsd: 0 },
        combined: data?.combined || { totalDeposited: '0', tvlUsd: 0 },
        isLoading,
        isError,
        error,
    }
}



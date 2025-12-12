import { useMemo } from 'react'
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
            return { v1Total, v2Total }
        },
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })

    const result = useMemo<UseHaiVeloStatsResult>(() => {
        const v1Total = data?.v1Total || 0
        const v2Total = data?.v2Total || 0
        const v1Usd = v1Total * haiVeloPriceUsd
        const v2Usd = v2Total * haiVeloPriceUsd
        return {
            v1: { totalDeposited: String(v1Total), tvlUsd: v1Usd },
            v2: { totalDeposited: String(v2Total), tvlUsd: v2Usd },
            combined: { totalDeposited: String(v1Total + v2Total), tvlUsd: v1Usd + v2Usd },
            isLoading,
            isError,
            error,
        }
    }, [data, haiVeloPriceUsd, isLoading, isError, error])

    return result
}

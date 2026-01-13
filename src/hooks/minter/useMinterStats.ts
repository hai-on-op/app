/**
 * useMinterStats Hook
 *
 * Fetches protocol-level statistics (TVL, total deposited) for a minter protocol.
 * Generalized from useHaiVeloStats to support multiple protocols.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MinterProtocolId, MinterProtocolStats } from '~/types/minterProtocol'
import { getProtocolConfig } from '~/services/minterProtocol'
import { fetchV1Safes, fetchV2Totals } from '~/services/minterProtocol/dataSources'

const FIVE_MINUTES_MS = 5 * 60 * 1000

/**
 * Hook to fetch protocol-level statistics for a minter protocol.
 *
 * @param protocolId - The minter protocol ID (e.g., 'haiVelo', 'haiAero')
 * @param protocolTokenPriceUsd - Price of the protocol token in USD
 * @param useTestnet - Whether to use testnet configuration
 * @returns Protocol statistics including TVL and total deposited
 */
export function useMinterStats(
    protocolId: MinterProtocolId,
    protocolTokenPriceUsd = 0,
    useTestnet = false
): MinterProtocolStats {
    const config = getProtocolConfig(protocolId, useTestnet)

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['minter', protocolId, 'stats'],
        queryFn: async () => {
            const [v1Data, v2Data] = await Promise.all([
                fetchV1Safes(config),
                fetchV2Totals(config),
            ])

            const v1Total = Number(v1Data.totalCollateral || '0')
            const v2Total = Number(v2Data.totalSupplyFormatted || '0')

            return { v1Total, v2Total }
        },
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })

    const result = useMemo<MinterProtocolStats>(() => {
        const v1Total = data?.v1Total || 0
        const v2Total = data?.v2Total || 0
        const v1Usd = v1Total * protocolTokenPriceUsd
        const v2Usd = v2Total * protocolTokenPriceUsd

        return {
            v1: { totalDeposited: String(v1Total), tvlUsd: v1Usd },
            v2: { totalDeposited: String(v2Total), tvlUsd: v2Usd },
            combined: {
                totalDeposited: String(v1Total + v2Total),
                tvlUsd: v1Usd + v2Usd,
            },
            isLoading,
            isError,
            error,
        }
    }, [data, protocolTokenPriceUsd, isLoading, isError, error])

    return result
}

/**
 * Hook to get the query key for minter stats.
 * Useful for invalidating queries from outside the hook.
 */
export function getMinterStatsQueryKey(protocolId: MinterProtocolId): string[] {
    return ['minter', protocolId, 'stats']
}


import { useQuery } from '@tanstack/react-query'
import { fetchV2UserBalance, fetchVeloBalance, fetchVeNftsForOwner } from '~/services/haivelo/dataSources'
import { useBalance } from '~/hooks/useBalance'

export type VeNft = { tokenId: string; balance: string; balanceFormatted: string }

export type UseHaiVeloAccountResult = {
    v1Balance: string // formatted from app token store (HAIVELO)
    v2Balance: { raw: string; formatted: string; decimals: number }
    velo: { raw: string; formatted: string; decimals: number }
    veNft: { totalRaw: string; totalFormatted: string; nfts: VeNft[] }
    isLoading: boolean
    isError: boolean
    error: unknown
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export function useHaiVeloAccount(address?: string): UseHaiVeloAccountResult {
    const v1 = useBalance('HAIVELO') // Reuse app store for v1 balance for now

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['haivelo', 'account', address?.toLowerCase() || '0x'],
        enabled: Boolean(address),
        queryFn: async () => {
            const [v2, velo, ve] = await Promise.all([
                fetchV2UserBalance(address!),
                fetchVeloBalance(address!),
                fetchVeNftsForOwner(address!),
            ])
            return { v2, velo, ve }
        },
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })

    return {
        v1Balance: v1?.raw || '0',
        v2Balance: data?.v2 || { raw: '0', formatted: '0', decimals: 18 },
        velo: data?.velo || { raw: '0', formatted: '0', decimals: 18 },
        veNft: data?.ve || { totalRaw: '0', totalFormatted: '0', nfts: [] },
        isLoading,
        isError,
        error,
    }
}

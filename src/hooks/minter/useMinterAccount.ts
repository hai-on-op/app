/**
 * useMinterAccount Hook
 *
 * Fetches account data (balances, veNFTs) for a minter protocol.
 * Generalized from useHaiVeloAccount to support multiple protocols.
 */

import { useQuery } from '@tanstack/react-query'
import type { MinterProtocolId, MinterAccountData } from '~/types/minterProtocol'
import { getProtocolConfig } from '~/services/minterProtocol'
import { fetchAccountData } from '~/services/minterProtocol/dataSources'
import { useBalance } from '~/hooks/useBalance'

const FIVE_MINUTES_MS = 5 * 60 * 1000

/**
 * Hook to fetch account data for a minter protocol.
 *
 * @param protocolId - The minter protocol ID (e.g., 'haiVelo', 'haiAero')
 * @param address - User's wallet address
 * @param useTestnet - Whether to use testnet configuration
 * @returns Account data including balances and veNFT info
 */
export function useMinterAccount(
    protocolId: MinterProtocolId,
    address?: string,
    useTestnet = false
): MinterAccountData {
    const config = getProtocolConfig(protocolId, useTestnet)

    // Get V1 balance from app token store if V1 is supported
    const v1TokenSymbol = config.tokens.wrappedTokenV1Symbol
    const v1Balance = useBalance(v1TokenSymbol || '')

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['minter', protocolId, 'account', address?.toLowerCase() || '0x'],
        enabled: Boolean(address),
        queryFn: async () => {
            const accountData = await fetchAccountData(config, address!)
            return accountData
        },
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })

    return {
        v1Balance: v1Balance?.raw || '0',
        v2Balance: data?.v2Balance || { raw: '0', formatted: '0', decimals: 18 },
        baseTokenBalance: data?.baseTokenBalance || { raw: '0', formatted: '0', decimals: 18 },
        veNft: data?.veNftData || { totalRaw: '0', totalFormatted: '0', nfts: [] },
        isLoading,
        isError,
        error,
    }
}

/**
 * Hook to get the query key for minter account data.
 * Useful for invalidating queries from outside the hook.
 */
export function getMinterAccountQueryKey(protocolId: MinterProtocolId, address?: string): string[] {
    return ['minter', protocolId, 'account', address?.toLowerCase() || '0x']
}


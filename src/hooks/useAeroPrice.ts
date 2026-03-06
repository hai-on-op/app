/**
 * useAeroPrice
 *
 * Fetches AERO token price (Base chain) via DeFiLlama with CoinGecko fallback.
 * Used for haiAERO stats TVL and other AERO-denominated displays.
 */

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const AERO_DEFILLAMA_ID = 'base:0x940181a94A35A4569E4529A3CDfB74e38FD98631'
const AERO_FALLBACK_PRICE = '0.44'
const FIVE_MINUTES_MS = 5 * 60 * 1000

async function fetchAeroPrice(): Promise<number> {
    try {
        const res = await axios.get(`https://coins.llama.fi/prices/current/${AERO_DEFILLAMA_ID}`, {
            timeout: 5000,
        })
        const price = res.data?.coins?.[AERO_DEFILLAMA_ID]?.price
        if (price != null) return Number(price)
    } catch (error) {
        console.warn('[useAeroPrice] DeFiLlama failed, trying fallback:', error)
    }

    try {
        const res = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price?ids=aerodrome-finance&vs_currencies=usd',
            { timeout: 5000 }
        )
        const price = res.data?.['aerodrome-finance']?.usd
        if (price != null) return Number(price)
    } catch (error) {
        console.warn('[useAeroPrice] CoinGecko also failed:', error)
    }

    return Number(AERO_FALLBACK_PRICE)
}

export function useAeroPrice(): { priceUsd: number; isLoading: boolean; error: unknown } {
    const { data, isLoading, error } = useQuery({
        queryKey: ['aeroPrice'],
        queryFn: fetchAeroPrice,
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })

    return {
        priceUsd: data ?? 0,
        isLoading,
        error,
    }
}

import { useAnalytics } from '~/providers/AnalyticsProvider'

export function useHaiMarketPrice(): { priceUsd: number; isLoading: boolean; error: unknown } {
    const { haiMarketPrice } = useAnalytics()
    const systemMarketPrice = Number(haiMarketPrice.raw || 0)
    const hasSystemMarketPrice = Number.isFinite(systemMarketPrice) && systemMarketPrice > 0

    return {
        priceUsd: hasSystemMarketPrice ? systemMarketPrice : 0,
        isLoading: !hasSystemMarketPrice,
        error: null,
    }
}

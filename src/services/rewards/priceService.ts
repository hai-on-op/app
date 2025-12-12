import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useStoreState } from '~/store'

export type PriceSnapshot = {
    kitePrice: number
    haiPrice: number
    opPrice: number
}

// Thin adapter to standardize price reads for APR math
export function usePriceSnapshot(): { data: PriceSnapshot; loading: boolean } {
    const { prices: veloPrices, loading: veloLoading } = useVelodromePrices()
    const {
        vaultModel: { liquidationData },
    } = useStoreState((s) => s)

    const kitePrice = Number(veloPrices?.KITE?.raw || 0)
    const haiPrice = parseFloat(liquidationData?.currentRedemptionPrice || '1')
    const opPrice = Number(liquidationData?.collateralLiquidationData?.OP?.currentPrice.value || 0)

    return { data: { kitePrice, haiPrice, opPrice }, loading: Boolean(veloLoading) }
}

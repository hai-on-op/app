import { useMemo } from 'react'
import { useStoreState } from '~/store'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'

export type StakePrices = {
    kitePrice: number
    haiPrice: number
    opPrice: number
}

export function useStakePrices(): { data: StakePrices; loading: boolean } {
    const { prices: veloPrices, loading } = useVelodromePrices()
    const {
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)

    const data = useMemo(() => {
        const kitePrice = Number(veloPrices?.KITE?.raw || 0)
        const haiPrice = parseFloat(liquidationData?.currentRedemptionPrice || '1')
        const opPrice = Number(liquidationData?.collateralLiquidationData?.OP?.currentPrice.value || 0)
        return { kitePrice, haiPrice, opPrice }
    }, [veloPrices, liquidationData])

    return { data, loading }
}

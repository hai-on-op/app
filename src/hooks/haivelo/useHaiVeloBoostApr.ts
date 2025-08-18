import { useMemo } from 'react'
import { computeHaiVeloBoostApr } from '~/services/haiVeloService'

export type UseHaiVeloBoostAprParams = {
    mapping: Record<string, string>
    boostMap: Record<string, number>
    prices: { haiVeloPriceUsd: number; haiPriceUsd: number }
    latestTransferAmount: number
    userAddress?: string
}

export function useHaiVeloBoostApr({ mapping, boostMap, prices, latestTransferAmount, userAddress }: UseHaiVeloBoostAprParams) {
    return useMemo(() => {
        const result = computeHaiVeloBoostApr({
            mapping,
            boostMap,
            haiVeloPrice: prices.haiVeloPriceUsd || 0,
            haiPrice: prices.haiPriceUsd || 0,
            latestTransferAmount,
            userAddress,
        })
        return result
    }, [mapping, boostMap, prices.haiVeloPriceUsd, prices.haiPriceUsd, latestTransferAmount, userAddress])
}



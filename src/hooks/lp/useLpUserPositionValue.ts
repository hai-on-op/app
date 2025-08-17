import { useMemo } from 'react'
import type { Address } from '~/services/stakingService'
import { useLpPool } from './useLpPool'
import { useLpCurrentPositions } from './useLpCurrentPositions'
import { calculateUserPositionsValue } from '~/services/lpData'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useAnalytics } from '~/providers/AnalyticsProvider'

export function useLpUserPositionValue(address?: Address): { loading: boolean; value: number } {
	const { data: pool, isLoading: poolLoading } = useLpPool()
	const { data: currentPositions, isLoading: curLoading } = useLpCurrentPositions(address)
	const { prices: veloPrices, loading: velodromeLoading } = useVelodromePrices()
	const { haiMarketPrice, data: { tokenAnalyticsData } } = useAnalytics()

	const token0UsdPrice = useMemo(() => parseFloat(haiMarketPrice.raw || '0'), [haiMarketPrice])
	const token1UsdPrice = useMemo(() => {
		const weth = tokenAnalyticsData.find((t) => t.symbol === 'WETH')
		return weth ? Number(weth.currentPrice) / 1e18 : 0
	}, [tokenAnalyticsData])

	const loading = poolLoading || curLoading || Boolean(velodromeLoading)

	const value = useMemo(() => {
		if (!pool || !currentPositions) return 0
		return calculateUserPositionsValue(currentPositions, pool, token0UsdPrice, token1UsdPrice)
	}, [pool, currentPositions, token0UsdPrice, token1UsdPrice])

	return { loading, value }
}

export default useLpUserPositionValue



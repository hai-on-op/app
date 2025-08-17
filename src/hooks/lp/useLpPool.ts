import { useQuery } from '@tanstack/react-query'
export type PoolData = {
	id: string
	liquidity: string
	totalValueLockedToken0: string
	totalValueLockedToken1: string
	totalValueLockedUSD: string
	token0: { symbol: string; decimals: number }
	token1: { symbol: string; decimals: number }
	token0Price: string
	token1Price: string
	tick: string
	sqrtPrice: string
}
import { fetchPoolData } from '~/services/lpData'

const FIVE_MINUTES_MS = 5 * 60 * 1000

export function useLpPool() {
	return useQuery<PoolData | null>({
		queryKey: ['lp', 'pool'],
		queryFn: async () => fetchPoolData(),
		staleTime: FIVE_MINUTES_MS,
		refetchInterval: FIVE_MINUTES_MS,
	})
}



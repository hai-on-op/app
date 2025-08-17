import { useQuery } from '@tanstack/react-query'
import type { PoolData } from '~/model/lpDataModel'
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



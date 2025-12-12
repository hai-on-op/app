import { useQuery } from '@tanstack/react-query'
import type { UserPosition } from './useLpUserPositionsMap'
import { fetchAllActivePositions } from '~/services/lpData'

const FIVE_MINUTES_MS = 5 * 60 * 1000

export function useLpAllPositions() {
    return useQuery<UserPosition[] | null>({
        queryKey: ['lp', 'positions', 'all'],
        queryFn: async () => fetchAllActivePositions(),
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })
}

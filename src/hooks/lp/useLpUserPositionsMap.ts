import { useMemo } from 'react'
export type UserPosition = {
	id: string
	liquidity: string
	depositedToken0: string
	depositedToken1: string
	withdrawnToken0: string
	withdrawnToken1: string
	tickLower: { tickIdx: string }
	tickUpper: { tickIdx: string }
	owner: string
}
import { useLpAllPositions } from './useLpAllPositions'
import { groupPositionsByUser } from '~/services/lpData'

export function useLpUserPositionsMap(): { data: Record<string, UserPosition[]> | null; isLoading: boolean; isError: boolean; error: unknown } {
	const { data, isLoading, isError, error } = useLpAllPositions()
	const map = useMemo(() => {
		if (!data) return null
		return groupPositionsByUser(data)
	}, [data])
	return { data: map, isLoading, isError, error }
}



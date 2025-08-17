import { useMemo } from 'react'
import type { UserPosition } from '~/model/lpDataModel'
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



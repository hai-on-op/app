import { useMemo } from 'react'
import type { Address } from '~/services/stakingService'
import type { CurrentUserPosition } from '~/model/lpDataModel'
import { useLpPool } from './useLpPool'
import { useLpUserPositions } from './useLpUserPositions'
import { calculateCurrentPositionComposition } from '~/services/lpData'

export function useLpCurrentPositions(address?: Address): { data: CurrentUserPosition[] | null; isLoading: boolean; isError: boolean; error: unknown } {
	const { data: pool, isLoading: poolLoading, isError: poolError, error: poolErr } = useLpPool()
	const { data: positions, isLoading: posLoading, isError: posError, error: posErr } = useLpUserPositions(address)

	const derived = useMemo<CurrentUserPosition[] | null>(() => {
		if (!pool || !positions) return null
		const current = calculateCurrentPositionComposition(positions, pool)
		return current
	}, [pool, positions])

	return {
		data: derived,
		isLoading: poolLoading || posLoading,
		isError: Boolean(poolError || posError),
		error: poolErr || posErr,
	}
}



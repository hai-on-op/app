import { useMemo } from 'react'
import type { Address } from '~/services/stakingService'
import { useLpUserPositions } from './useLpUserPositions'
import { calculateUserTotalLiquidity } from '~/services/lpData'

export function useLpUserTotalLiquidity(address?: Address): { loading: boolean; value: string } {
	const { data: positions, isLoading } = useLpUserPositions(address)
	const value = useMemo(() => {
		if (!positions) return '0'
		return calculateUserTotalLiquidity(positions)
	}, [positions])
	return { loading: isLoading, value }
}



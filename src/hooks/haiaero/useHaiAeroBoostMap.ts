import { useMemo } from 'react'
import { calculateHaiVeloBoostMap } from '~/services/haiVeloService'

export type UseHaiAeroBoostMapParams = {
    mapping: Record<string, string>
    usersStakingData: Record<string, { stakedBalance: string | number }>
    totalStaked: number
}

/**
 * Compute per-user boost multipliers for haiAERO depositors.
 * The boost formula is identical to haiVELO: min((kiteRatio / depositRatio) + 1, 2).
 */
export function useHaiAeroBoostMap({ mapping, usersStakingData, totalStaked }: UseHaiAeroBoostMapParams) {
    return useMemo(() => {
        const totalHaiAeroDeposited = Object.values(mapping).reduce((acc, v) => acc + Number(v), 0)
        const lowerUsers: Record<string, { stakedBalance: number }> = {}
        Object.entries(usersStakingData || {}).forEach(([addr, d]) => {
            lowerUsers[addr.toLowerCase()] = { stakedBalance: Number(d?.stakedBalance || 0) }
        })
        // Reuse the same boost calculation – the formula is protocol-agnostic
        const boostMap = calculateHaiVeloBoostMap(
            mapping,
            lowerUsers as any,
            Number(totalStaked || 0),
            totalHaiAeroDeposited
        )
        return boostMap as Record<string, number>
    }, [mapping, usersStakingData, totalStaked])
}

import { useMemo } from 'react'
import { calculateHaiVeloBoostMap } from '~/services/haiVeloService'

export type UseHaiVeloBoostMapParams = {
    mapping: Record<string, string>
    usersStakingData: Record<string, { stakedBalance: string | number }>
    totalStaked: number
}

export function useHaiVeloBoostMap({ mapping, usersStakingData, totalStaked }: UseHaiVeloBoostMapParams) {
    return useMemo(() => {
        const totalHaiVeloDeposited = Object.values(mapping).reduce((acc, v) => acc + Number(v), 0)
        const lowerUsers: Record<string, { stakedBalance: number }> = {}
        Object.entries(usersStakingData || {}).forEach(([addr, d]) => {
            lowerUsers[addr.toLowerCase()] = { stakedBalance: Number(d?.stakedBalance || 0) }
        })
        const boostMap = calculateHaiVeloBoostMap(
            mapping,
            lowerUsers as any,
            Number(totalStaked || 0),
            totalHaiVeloDeposited
        )
        return boostMap as Record<string, number>
    }, [mapping, usersStakingData, totalStaked])
}

import { useMemo } from 'react'
import type { Address } from '~/services/stakingService'
import { defaultStakingService } from '~/services/stakingService'
import { useStakeAccount } from './useStakeAccount'

export function useStakeEffectiveBalance(
    address?: Address,
    namespace: string = 'kite',
    service = defaultStakingService
): { loading: boolean; value: number } {
    const { data, isLoading } = useStakeAccount(address, namespace, service)
    const value = useMemo(() => {
        if (!data) return 0
        // Contract stakedBalance already reflects any initiated withdrawals.
        // Do not subtract pending again to avoid double-counting.
        return Number(data.stakedBalance || 0)
    }, [data])
    return { loading: isLoading, value }
}



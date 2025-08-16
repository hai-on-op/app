import { useMemo } from 'react'
import type { Address } from '~/services/stakingService'
import { useStakeAccount } from './useStakeAccount'

export function useStakeEffectiveBalance(address?: Address): { loading: boolean; value: number } {
    const { data, isLoading } = useStakeAccount(address)
    const value = useMemo(() => {
        if (!data) return 0
        const base = Number(data.stakedBalance || 0)
        const pending = Number(data.pendingWithdrawal?.amount || 0)
        return Math.max(0, base - pending)
    }, [data])
    return { loading: isLoading, value }
}



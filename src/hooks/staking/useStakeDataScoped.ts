import { useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { useStakeAccount } from '~/hooks/staking/useStakeAccount'
import { useStakeStats } from '~/hooks/staking/useStakeStats'
import { useStakePendingWithdrawalQuery } from '~/hooks/staking/useStakePendingWithdrawalQuery'

export function useStakeDataScoped(namespace: string = 'kite', options?: { poolKey?: string }) {
    const { address } = useAccount()
    const qc = useQueryClient()

    const account = useStakeAccount(address as any, namespace)
    const stats = useStakeStats(namespace)

    // Subgraph-backed pending withdrawal sync
    const pendingQuery = useStakePendingWithdrawalQuery(namespace, address)

    const loading = account.isLoading || stats.isLoading

    const data = useMemo(() => {
        return {
            stakedBalance: account.data?.stakedBalance || '0',
            pendingWithdrawal: pendingQuery.data ?? account.data?.pendingWithdrawal ?? null,
            cooldownPeriod: account.data?.cooldown ?? 0,
            totalStaked: stats.data?.totalStaked || '0',
        }
    }, [account.data?.stakedBalance, pendingQuery.data, account.data?.pendingWithdrawal, account.data?.cooldown, stats.data?.totalStaked])

    const refetchAll = useCallback(async () => {
        await Promise.all([
            qc.invalidateQueries({ queryKey: ['stake', namespace, 'account'] }),
            qc.invalidateQueries({ queryKey: ['stake', namespace, 'stats'] }),
        ])
    }, [qc, namespace])

    return { loading, ...data, refetchAll }
}



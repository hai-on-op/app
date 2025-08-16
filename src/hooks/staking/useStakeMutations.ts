import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEthersSigner } from '~/hooks'
import type { Address } from '~/services/stakingService'
import {
    stake as svcStake,
    initiateWithdrawal as svcInitiate,
    withdraw as svcWithdraw,
    cancelWithdrawal as svcCancel,
    claimRewards as svcClaim,
} from '~/services/stakingService'

type AccountCache = {
    stakedBalance: string
    pendingWithdrawal: { amount: string; timestamp: number } | null
    rewards: Array<{ tokenAddress: Address; amount: string }>
    cooldown: number
}

type StatsCache = { totalStaked: string }

export function useStakeMutations(address?: Address) {
    const signer = useEthersSigner()
    const qc = useQueryClient()
    const accountKey = ['stake', 'account', address?.toLowerCase() || '0x0']
    const statsKey = ['stake', 'stats']

    const common = {
        onSuccess: async () => {
            await Promise.all([qc.invalidateQueries({ queryKey: accountKey }), qc.invalidateQueries({ queryKey: statsKey })])
        },
    }

    const stake = useMutation({
        mutationFn: async (amount: string) => {
            if (!signer) throw new Error('No signer')
            return svcStake(signer, amount)
        },
        onMutate: async (amount: string) => {
            const prevAccount = qc.getQueryData<AccountCache>(accountKey)
            const prevStats = qc.getQueryData<StatsCache>(statsKey)
            if (prevAccount && prevStats) {
                const nextBalance = String(Number(prevAccount.stakedBalance) + Number(amount))
                const nextTotal = String(Number(prevStats.totalStaked) + Number(amount))
                qc.setQueryData<AccountCache>(accountKey, { ...prevAccount, stakedBalance: nextBalance })
                qc.setQueryData<StatsCache>(statsKey, { totalStaked: nextTotal })
            }
            return { prevAccount, prevStats }
        },
        onError: (_e, _vars, ctx) => {
            if (ctx?.prevAccount) qc.setQueryData(accountKey, ctx.prevAccount)
            if (ctx?.prevStats) qc.setQueryData(statsKey, ctx.prevStats)
        },
        ...common,
    })

    const initiateWithdrawal = useMutation({
        mutationFn: async (amount: string) => {
            if (!signer) throw new Error('No signer')
            return svcInitiate(signer, amount)
        },
        onMutate: async (amount: string) => {
            const prevAccount = qc.getQueryData<AccountCache>(accountKey)
            const prevStats = qc.getQueryData<StatsCache>(statsKey)
            if (prevAccount && prevStats) {
                const nextBalance = String(Math.max(0, Number(prevAccount.stakedBalance) - Number(amount)))
                qc.setQueryData<AccountCache>(accountKey, {
                    ...prevAccount,
                    stakedBalance: nextBalance,
                    pendingWithdrawal: {
                        amount,
                        timestamp: Math.floor(Date.now() / 1000),
                    },
                })
            }
            return { prevAccount, prevStats }
        },
        onError: (_e, _vars, ctx) => {
            if (ctx?.prevAccount) qc.setQueryData(accountKey, ctx.prevAccount)
            if (ctx?.prevStats) qc.setQueryData(statsKey, ctx.prevStats)
        },
        ...common,
    })

    const withdraw = useMutation({
        mutationFn: async () => {
            if (!signer) throw new Error('No signer')
            return svcWithdraw(signer)
        },
        onMutate: async () => {
            const prevAccount = qc.getQueryData<AccountCache>(accountKey)
            const prevStats = qc.getQueryData<StatsCache>(statsKey)
            if (prevAccount) {
                qc.setQueryData<AccountCache>(accountKey, { ...prevAccount, pendingWithdrawal: null })
            }
            return { prevAccount, prevStats }
        },
        onError: (_e, _vars, ctx) => {
            if (ctx?.prevAccount) qc.setQueryData(accountKey, ctx.prevAccount)
            if (ctx?.prevStats) qc.setQueryData(statsKey, ctx.prevStats)
        },
        ...common,
    })

    const cancelWithdrawal = useMutation({
        mutationFn: async () => {
            if (!signer) throw new Error('No signer')
            return svcCancel(signer)
        },
        onMutate: async () => {
            const prevAccount = qc.getQueryData<AccountCache>(accountKey)
            const prevStats = qc.getQueryData<StatsCache>(statsKey)
            if (prevAccount) {
                const amount = Number(prevAccount.pendingWithdrawal?.amount || 0)
                const nextBalance = String(Number(prevAccount.stakedBalance) + amount)
                qc.setQueryData<AccountCache>(accountKey, {
                    ...prevAccount,
                    stakedBalance: nextBalance,
                    pendingWithdrawal: null,
                })
            }
            return { prevAccount, prevStats }
        },
        onError: (_e, _vars, ctx) => {
            if (ctx?.prevAccount) qc.setQueryData(accountKey, ctx.prevAccount)
            if (ctx?.prevStats) qc.setQueryData(statsKey, ctx.prevStats)
        },
        ...common,
    })

    const claimRewards = useMutation({
        mutationFn: async () => {
            if (!signer) throw new Error('No signer')
            return svcClaim(signer)
        },
        onMutate: async () => {
            const prevAccount = qc.getQueryData<AccountCache>(accountKey)
            const prevStats = qc.getQueryData<StatsCache>(statsKey)
            if (prevAccount) {
                qc.setQueryData<AccountCache>(accountKey, { ...prevAccount, rewards: [] })
            }
            return { prevAccount, prevStats }
        },
        onError: (_e, _vars, ctx) => {
            if (ctx?.prevAccount) qc.setQueryData(accountKey, ctx.prevAccount)
            if (ctx?.prevStats) qc.setQueryData(statsKey, ctx.prevStats)
        },
        ...common,
    })

    return useMemo(() => ({ stake, initiateWithdrawal, withdraw, cancelWithdrawal, claimRewards }), [
        stake,
        initiateWithdrawal,
        withdraw,
        cancelWithdrawal,
        claimRewards,
    ])
}



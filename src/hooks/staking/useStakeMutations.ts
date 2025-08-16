/**
 * Staking mutations with optimistic updates
 *
 * This hook centralizes all write operations related to staking and applies
 * optimistic updates to the React Query cache so the UI feels instant.
 *
 * Cache contracts
 * - Account cache (per user): queryKey ['stake', 'account', address]
 *   shape: {
 *     stakedBalance: string            // human-readable (ether) string
 *     pendingWithdrawal: { amount: string; timestamp: number } | null
 *     rewards: Array<{ tokenAddress: Address; amount: string }>
 *     cooldown: number                 // seconds
 *   }
 * - Stats cache (global): queryKey ['stake', 'stats']
 *   shape: { totalStaked: string }
 *
 * Optimistic strategy
 * - onMutate takes a snapshot of current cache (for rollback) and writes the new state immediately
 * - onError restores the snapshot
 * - onSuccess invalidates queries to reconcile with on-chain truth
 *
 * Notes
 * - Amounts are handled as human-readable strings and converted to Number for simple arithmetic.
 *   If sub-decimal precision beyond JS number is required, switch to a decimal library.
 */
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

    /**
     * Stake KITE
     * - Optimistically increases user's staked balance and global total
     */
    const stake = useMutation({
        mutationKey: ['stake', 'mut', 'stake'],
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

    /**
     * Initiate withdrawal (unstake)
     * - Optimistically reduces user's staked balance and sets a pendingWithdrawal entry
     */
    const initiateWithdrawal = useMutation({
        mutationKey: ['stake', 'mut', 'initiateWithdrawal'],
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

    /**
     * Withdraw (claim unstaked tokens after cooldown)
     * - Optimistically clears pendingWithdrawal
     */
    const withdraw = useMutation({
        mutationKey: ['stake', 'mut', 'withdraw'],
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

    /**
     * Cancel withdrawal (re-stake the pending amount)
     * - Optimistically moves pendingWithdrawal.amount back into stakedBalance and clears pending
     */
    const cancelWithdrawal = useMutation({
        mutationKey: ['stake', 'mut', 'cancelWithdrawal'],
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

    /**
     * Claim rewards
     * - Optimistically clears the rewards array
     */
    const claimRewards = useMutation({
        mutationKey: ['stake', 'mut', 'claimRewards'],
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



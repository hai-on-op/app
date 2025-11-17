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
import { useStoreActions } from '~/store'
import { useEthersSigner } from '~/hooks'
import type { Address } from '~/services/stakingService'
import { client as apolloClient } from '~/utils/graphql/client'
import { defaultStakingService } from '~/services/stakingService'
import { stakeQueryKeys } from '~/hooks/staking/stakeQueryKeys'
import type { StakingUserEntity } from '~/types/stakingConfig'

type AccountCache = {
    stakedBalance: string
    pendingWithdrawal: { amount: string; timestamp: number } | null
    rewards: Array<{ tokenAddress: Address; amount: string }>
    cooldown: number
}

type StatsCache = { totalStaked: string }

export function useStakeMutations(address?: Address, namespace: string = 'kite', service = defaultStakingService) {
    const signer = useEthersSigner()
    const qc = useQueryClient()
    const { setForceUpdateTokens } = useStoreActions((a) => a.connectWalletModel)
    const accountKey = stakeQueryKeys.account(namespace, address)
    const statsKey = stakeQueryKeys.stats(namespace)

    // Default to the canonical single-token staking user entity for KITE.
    // LP pools can override this by passing a different subgraph user entity
    // via the options object in useStakePendingWithdrawalQuery; for invalidation
    // we broadly target by namespace and address, so the specific entity string
    // is not required here.
    const defaultUserEntity: StakingUserEntity = 'stakingUser'

    const handleCommonSuccess = async () => {
        await Promise.all([
            qc.invalidateQueries({ queryKey: accountKey, refetchType: 'active' }),
            qc.invalidateQueries({ queryKey: statsKey, refetchType: 'active' }),
            // Pending-withdrawal queries (all addresses in namespace + this address)
            qc.invalidateQueries({ queryKey: stakeQueryKeys.pendingBase(namespace), refetchType: 'active' }),
            qc.invalidateQueries({
                queryKey: stakeQueryKeys.pendingForAddress(namespace, address),
                refetchType: 'active',
            }),
        ])
        setForceUpdateTokens(true)
    }

    const handleCommonSettled = async () => {
        await Promise.all([
            qc.refetchQueries({ queryKey: accountKey, type: 'active' }),
            qc.refetchQueries({ queryKey: statsKey, type: 'active' }),
            qc.refetchQueries({ queryKey: stakeQueryKeys.pendingBase(namespace), type: 'active' }),
            qc.refetchQueries({
                queryKey: stakeQueryKeys.pendingForAddress(namespace, address),
                type: 'active',
            }),
        ])
        setForceUpdateTokens(true)
    }

    /**
     * Stake KITE
     * - Optimistically increases user's staked balance and global total
     */
    const stake = useMutation({
        mutationKey: ['stake', 'mut', 'stake'],
        mutationFn: async (amount: string) => {
            if (!signer) throw new Error('No signer')
            return service.stake(signer, amount)
        },
        onMutate: async (amount: string) => {
            const prevAccount = qc.getQueryData<AccountCache>(accountKey)
            const prevStats = qc.getQueryData<StatsCache>(statsKey)
            const baseBal = Number(prevAccount?.stakedBalance || 0)
            const nextBalance = String(baseBal + Number(amount))
            // Update or seed account cache
            qc.setQueryData<AccountCache>(accountKey, {
                stakedBalance: nextBalance,
                pendingWithdrawal: prevAccount?.pendingWithdrawal || null,
                rewards: prevAccount?.rewards || [],
                cooldown: prevAccount?.cooldown || 0,
            })
            // Update stats only if present
            if (prevStats) {
                const nextTotal = String(Number(prevStats.totalStaked || 0) + Number(amount))
                qc.setQueryData<StatsCache>(statsKey, { totalStaked: nextTotal })
            }
            return { prevAccount, prevStats }
        },
        onError: (_e, _vars, ctx) => {
            if (ctx?.prevAccount) qc.setQueryData(accountKey, ctx.prevAccount)
            if (ctx?.prevStats) qc.setQueryData(statsKey, ctx.prevStats)
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: stakeQueryKeys.pendingBase(namespace) })
            await qc.invalidateQueries({ queryKey: stakeQueryKeys.pendingForAddress(namespace, address) })
            await qc.refetchQueries({ queryKey: stakeQueryKeys.pendingBase(namespace), type: 'active' })
            await qc.refetchQueries({
                queryKey: stakeQueryKeys.pendingForAddress(namespace, address),
                type: 'active',
            })
            try {
                await apolloClient.refetchQueries({ include: ['GetStakingUser', 'GetAllStakingUsers'] })
            } catch {}
            await handleCommonSuccess()
        },
        onSettled: handleCommonSettled,
    })

    /**
     * Initiate withdrawal (unstake)
     * - Optimistically reduces user's staked balance and sets a pendingWithdrawal entry
     */
    const initiateWithdrawal = useMutation({
        mutationKey: ['stake', 'mut', 'initiateWithdrawal'],
        mutationFn: async (amount: string) => {
            if (!signer) throw new Error('No signer')
            return service.initiateWithdrawal(signer, amount)
        },
        onMutate: async (amount: string) => {
            const prevAccount = qc.getQueryData<AccountCache>(accountKey)
            const prevStats = qc.getQueryData<StatsCache>(statsKey)
            const previousPendingAmount = prevAccount?.pendingWithdrawal?.amount
            const basePending = previousPendingAmount ? Number(previousPendingAmount) : 0
            const nextPendingAmount = String(basePending + Number(amount))

            qc.setQueryData<AccountCache>(accountKey, {
                stakedBalance: prevAccount?.stakedBalance || '0',
                pendingWithdrawal: {
                    amount: nextPendingAmount,
                    timestamp: Math.floor(Date.now() / 1000),
                },
                rewards: prevAccount?.rewards || [],
                cooldown: prevAccount?.cooldown || 0,
            })
            return { prevAccount, prevStats }
        },
        onError: (_e, _vars, ctx) => {
            if (ctx?.prevAccount) qc.setQueryData(accountKey, ctx.prevAccount)
            if (ctx?.prevStats) qc.setQueryData(statsKey, ctx.prevStats)
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: stakeQueryKeys.pendingBase(namespace) })
            await qc.invalidateQueries({ queryKey: stakeQueryKeys.pendingForAddress(namespace, address) })
            await qc.refetchQueries({ queryKey: stakeQueryKeys.pendingBase(namespace), type: 'active' })
            await qc.refetchQueries({
                queryKey: stakeQueryKeys.pendingForAddress(namespace, address),
                type: 'active',
            })
            try {
                await apolloClient.refetchQueries({ include: ['GetStakingUser', 'GetAllStakingUsers'] })
            } catch {}
            await handleCommonSuccess()
        },
        onSettled: handleCommonSettled,
    })

    /**
     * Withdraw (claim unstaked tokens after cooldown)
     * - Optimistically clears pendingWithdrawal
     */
    const withdraw = useMutation({
        mutationKey: ['stake', 'mut', 'withdraw'],
        mutationFn: async () => {
            if (!signer) throw new Error('No signer')
            return service.withdraw(signer)
        },
        onMutate: async () => {
            const prevAccount = qc.getQueryData<AccountCache>(accountKey)
            const prevStats = qc.getQueryData<StatsCache>(statsKey)
            qc.setQueryData<AccountCache>(accountKey, {
                stakedBalance: prevAccount?.stakedBalance || '0',
                pendingWithdrawal: null,
                rewards: prevAccount?.rewards || [],
                cooldown: prevAccount?.cooldown || 0,
            })
            return { prevAccount, prevStats }
        },
        onError: (_e, _vars, ctx) => {
            if (ctx?.prevAccount) qc.setQueryData(accountKey, ctx.prevAccount)
            if (ctx?.prevStats) qc.setQueryData(statsKey, ctx.prevStats)
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: stakeQueryKeys.pendingBase(namespace) })
            await qc.invalidateQueries({ queryKey: stakeQueryKeys.pendingForAddress(namespace, address) })
            await qc.refetchQueries({ queryKey: stakeQueryKeys.pendingBase(namespace), type: 'active' })
            await qc.refetchQueries({
                queryKey: stakeQueryKeys.pendingForAddress(namespace, address),
                type: 'active',
            })
            try {
                await apolloClient.refetchQueries({ include: ['GetStakingUser', 'GetAllStakingUsers'] })
            } catch {}
            await handleCommonSuccess()
        },
        onSettled: handleCommonSettled,
    })

    /**
     * Cancel withdrawal (re-stake the pending amount)
     * - Optimistically moves pendingWithdrawal.amount back into stakedBalance and clears pending
     */
    const cancelWithdrawal = useMutation({
        mutationKey: ['stake', 'mut', 'cancelWithdrawal'],
        mutationFn: async () => {
            if (!signer) throw new Error('No signer')
            return service.cancelWithdrawal(signer)
        },
        onMutate: async () => {
            const prevAccount = qc.getQueryData<AccountCache>(accountKey)
            const prevStats = qc.getQueryData<StatsCache>(statsKey)
            qc.setQueryData<AccountCache>(accountKey, {
                stakedBalance: prevAccount?.stakedBalance || '0',
                pendingWithdrawal: null,
                rewards: prevAccount?.rewards || [],
                cooldown: prevAccount?.cooldown || 0,
            })
            return { prevAccount, prevStats }
        },
        onError: (_e, _vars, ctx) => {
            if (ctx?.prevAccount) qc.setQueryData(accountKey, ctx.prevAccount)
            if (ctx?.prevStats) qc.setQueryData(statsKey, ctx.prevStats)
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: stakeQueryKeys.pendingBase(namespace) })
            await qc.invalidateQueries({ queryKey: stakeQueryKeys.pendingForAddress(namespace, address) })
            await qc.refetchQueries({ queryKey: stakeQueryKeys.pendingBase(namespace), type: 'active' })
            await qc.refetchQueries({
                queryKey: stakeQueryKeys.pendingForAddress(namespace, address),
                type: 'active',
            })
            try {
                await apolloClient.refetchQueries({ include: ['GetStakingUser', 'GetAllStakingUsers'] })
            } catch {}
            await handleCommonSuccess()
        },
        onSettled: handleCommonSettled,
    })

    /**
     * Claim rewards
     * - Optimistically clears the rewards array
     */
    const claimRewards = useMutation({
        mutationKey: ['stake', 'mut', 'claimRewards'],
        mutationFn: async () => {
            if (!signer) throw new Error('No signer')
            return service.claimRewards(signer)
        },
        onMutate: async () => {
            const prevAccount = qc.getQueryData<AccountCache>(accountKey)
            const prevStats = qc.getQueryData<StatsCache>(statsKey)
            qc.setQueryData<AccountCache>(accountKey, {
                stakedBalance: prevAccount?.stakedBalance || '0',
                pendingWithdrawal: prevAccount?.pendingWithdrawal || null,
                rewards: [],
                cooldown: prevAccount?.cooldown || 0,
            })
            return { prevAccount, prevStats }
        },
        onError: (_e, _vars, ctx) => {
            if (ctx?.prevAccount) qc.setQueryData(accountKey, ctx.prevAccount)
            if (ctx?.prevStats) qc.setQueryData(statsKey, ctx.prevStats)
        },
        onSuccess: handleCommonSuccess,
        onSettled: handleCommonSettled,
    })

    return useMemo(() => ({ stake, initiateWithdrawal, withdraw, cancelWithdrawal, claimRewards }), [
        stake,
        initiateWithdrawal,
        withdraw,
        cancelWithdrawal,
        claimRewards,
    ])
}



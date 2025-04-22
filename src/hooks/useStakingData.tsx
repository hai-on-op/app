import { useMemo, useEffect, useState, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'

import { useStoreState, useStoreActions } from '~/store'
import { useEthersSigner } from './'

const STAKING_USER_QUERY = gql`
    query GetStakingUser($id: ID!) {
        stakingUser(id: $id) {
            id
            stakedBalance
            totalStaked
            totalWithdrawn
            stakingPositions {
                id
                amount
                timestamp
                type
                transactionHash
            }
            rewards {
                id
                rewardToken
                amount
                destination
                timestamp
                transactionHash
            }
            pendingWithdrawal {
                id
                amount
                timestamp
                status
            }
        }
    }
`

const STAKING_STATS_QUERY = gql`
    query GetStakingStats {
        stakingStatistic(id: "singleton") {
            totalStaked
            totalStakers
            totalRewardsPaid
        }
    }
`

export type StakingPosition = {
    id: string
    amount: string
    timestamp: number
    type: 'STAKE' | 'INITIATE_WITHDRAWAL' | 'CANCEL_WITHDRAWAL' | 'WITHDRAW'
    transactionHash: string
}

export type RewardClaim = {
    id: string
    rewardToken: string
    amount: string
    destination: string
    timestamp: number
    transactionHash: string
}

export type PendingWithdrawal = {
    id: string
    amount: string
    timestamp: number
    status: 'PENDING' | 'CANCELLED' | 'COMPLETED'
}

export type StakingData = {
    stakedBalance: string
    totalStaked: string
    totalWithdrawn: string
    stakingPositions: StakingPosition[]
    rewards: RewardClaim[]
    pendingWithdrawal?: PendingWithdrawal
}

export type StakingStats = {
    totalStaked: string
    totalStakers: string
    totalRewardsPaid: string
}

const defaultStakingData: StakingData = {
    stakedBalance: '0',
    totalStaked: '0',
    totalWithdrawn: '0',
    stakingPositions: [],
    rewards: [],
}

const defaultStakingStats: StakingStats = {
    totalStaked: '0',
    totalStakers: '0',
    totalRewardsPaid: '0',
}

function formatBigNumber(value: string): string {
    try {
        return formatEther(BigNumber.from(value))
    } catch {
        return '0'
    }
}

export function useStakingData() {
    const { address } = useAccount()
    //const address = '0x328cace41eadf6df6e693b8e4810bf97aac4f5ee'

    const [refetchCounter, setRefetchCounter] = useState(0)
    const [localStakedBalance, setLocalStakedBalance] = useState<string | null>(null)
    const refetchTimeoutRef = useRef<number | null>(null)
    const pendingTransactionRef = useRef(false)

    const signer = useEthersSigner()
    const { stakingModel: stakingActions } = useStoreActions((actions) => actions)
    const cooldownPeriod = useStoreState((state) => state.stakingModel.cooldownPeriod)
    const totalStaked = useStoreState((state) => state.stakingModel.totalStaked)
    const userRewards = useStoreState((state) => state.stakingModel.userRewards)
    const stakingApyData = useStoreState((state) => state.stakingModel.stakingApyData)
    const stakedBalance = useStoreState((state) => state.stakingModel.stakedBalance)

    const stakingStat = useStoreState((state) => state.stakingModel.stakingApyData)

    const {
        data: userData,
        loading: userLoading,
        refetch: refetchUser,
    } = useQuery(STAKING_USER_QUERY, {
        variables: { id: address?.toLowerCase() },
        skip: !address,
        fetchPolicy: 'network-only', // Don't cache this data, always fetch fresh
    })

    const { data: statsData, loading: statsLoading, refetch: refetchStats } = useQuery(STAKING_STATS_QUERY, {
        fetchPolicy: 'network-only', // Don't cache this data, always fetch fresh
    })

    // Handles both immediate updates after transactions and scheduled refetches
    const refetchAll = async () => {
        if (signer) {
            console.log('Refetching all staking data', statsData)
            pendingTransactionRef.current = true
            
            // Cancel any pending refetch timeout
            if (refetchTimeoutRef.current) {
                clearTimeout(refetchTimeoutRef.current)
                refetchTimeoutRef.current = null
            }

            // Immediate refresh of on-chain data
            setRefetchCounter((prev) => prev + 1)
            
            try {
                // First get direct contract data which is immediately available
                const [userStakedBalance, totalStakedAmount] = await Promise.all([
                    stakingActions.fetchUserStakedBalance({ signer }),
                    stakingActions.fetchTotalStaked({ signer }),
                ])
                
                // Update our local state immediately with contract data
                if (userStakedBalance) {
                    setLocalStakedBalance(formatEther(userStakedBalance))
                }
                
                // Run all the other data fetches including GraphQL
                await Promise.all([
                    refetchUser(),
                    refetchStats(),
                    stakingActions.fetchCooldownPeriod({ signer }),
                    stakingActions.fetchUserRewards({ signer }),
                    stakingActions.fetchStakingApyData({ signer }),
                ])
                
                // Schedule another refetch after a delay to ensure subgraph is updated
                refetchTimeoutRef.current = window.setTimeout(async () => {
                    console.log('Delayed refetch to ensure GraphQL data is updated')
                    await Promise.all([refetchUser(), refetchStats()])
                    pendingTransactionRef.current = false
                    setLocalStakedBalance(null) // Clear local override after GraphQL is updated
                }, 15000) // 15 second delay for subgraph indexing
            } catch (error) {
                console.error('Error refetching staking data:', error)
                pendingTransactionRef.current = false
            }
        }
    }

    useEffect(() => {
        if (signer) {
            stakingActions.fetchCooldownPeriod({ signer })
            stakingActions.fetchUserRewards({ signer })
            stakingActions.fetchStakingApyData({ signer })
            stakingActions.fetchTotalStaked({ signer })
            stakingActions.fetchUserStakedBalance({ signer })
        }
    }, [signer, stakingActions])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (refetchTimeoutRef.current) {
                clearTimeout(refetchTimeoutRef.current)
            }
        }
    }, [])

    const stakingData = useMemo((): StakingData => {
        if (!userData?.stakingUser && !localStakedBalance) return defaultStakingData

        // If we have a local staked balance from a recent transaction, use it
        // This ensures we show the updated balance immediately after a transaction
        if (localStakedBalance && pendingTransactionRef.current) {
            return {
                stakedBalance: localStakedBalance,
                totalStaked: formatBigNumber(totalStaked),
                totalWithdrawn: userData?.stakingUser?.totalWithdrawn ? formatBigNumber(userData.stakingUser.totalWithdrawn) : '0',
                stakingPositions: userData?.stakingUser?.stakingPositions 
                    ? userData.stakingUser.stakingPositions.map((pos: any) => ({
                        ...pos,
                        amount: formatBigNumber(pos.amount),
                        timestamp: Number(pos.timestamp),
                    }))
                    : [],
                rewards: userData?.stakingUser?.rewards 
                    ? userData.stakingUser.rewards.map((reward: any) => ({
                        ...reward,
                        amount: formatBigNumber(reward.amount),
                        timestamp: Number(reward.timestamp),
                    }))
                    : [],
                pendingWithdrawal: userData?.stakingUser?.pendingWithdrawal
                    ? {
                        ...userData.stakingUser.pendingWithdrawal,
                        amount: formatBigNumber(userData.stakingUser.pendingWithdrawal.amount),
                        timestamp: Number(userData.stakingUser.pendingWithdrawal.timestamp),
                    }
                    : undefined,
            }
        }

        if (!userData?.stakingUser) return defaultStakingData;

        const user = userData.stakingUser
        return {
            stakedBalance: formatBigNumber(user.stakedBalance),
            // totalStaked: formatBigNumber(user.totalStaked),
            totalStaked: formatBigNumber(totalStaked),
            totalWithdrawn: formatBigNumber(user.totalWithdrawn),
            stakingPositions: user.stakingPositions.map((pos: any) => ({
                ...pos,
                amount: formatBigNumber(pos.amount),
                timestamp: Number(pos.timestamp),
            })),
            rewards: user.rewards.map((reward: any) => ({
                ...reward,
                amount: formatBigNumber(reward.amount),
                timestamp: Number(reward.timestamp),
            })),
            pendingWithdrawal: user.pendingWithdrawal
                ? {
                      ...user.pendingWithdrawal,
                      amount: formatBigNumber(user.pendingWithdrawal.amount),
                      timestamp: Number(user.pendingWithdrawal.timestamp),
                  }
                : undefined,
        }
    }, [userData, refetchCounter, localStakedBalance, pendingTransactionRef.current, totalStaked])

    const stakingStats = useMemo((): StakingStats => {
        if (!statsData?.stakingStatistic) return defaultStakingStats

        const stats = statsData.stakingStatistic
        return {
            totalStaked: formatBigNumber(stats.totalStaked),
            totalStakers: stats.totalStakers.toString(),
            totalRewardsPaid: formatBigNumber(stats.totalRewardsPaid),
        }
    }, [statsData])

    const loading = userLoading || statsLoading

    return {
        stakingData,
        stakingStats,
        stakedBalance,
        totalStaked,
        loading,
        cooldownPeriod,
        userRewards,
        stakingApyData,
        refetchAll,
    }
}

import { useMemo, useEffect } from 'react'
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
    const signer = useEthersSigner()
    const { stakingModel: stakingActions } = useStoreActions((actions) => actions)
    const cooldownPeriod = useStoreState((state) => state.stakingModel.cooldownPeriod)
    const userRewards = useStoreState((state) => state.stakingModel.userRewards)

    const { data: userData, loading: userLoading, refetch: refetchUser } = useQuery(STAKING_USER_QUERY, {
        variables: { id: address?.toLowerCase() },
        skip: !address,
    })

    const { data: statsData, loading: statsLoading, refetch: refetchStats } = useQuery(STAKING_STATS_QUERY)

    const refetchAll = async () => {
        if (signer) {
            await Promise.all([
                refetchUser(),
                refetchStats(),
                stakingActions.fetchCooldownPeriod({ signer }),
                stakingActions.fetchUserRewards({ signer })
            ])
        }
    }

    useEffect(() => {
        if (signer) {
            stakingActions.fetchCooldownPeriod({ signer })
            stakingActions.fetchUserRewards({ signer })
        }
    }, [signer, stakingActions])

    const stakingData = useMemo((): StakingData => {
        if (!userData?.stakingUser) return defaultStakingData

        const user = userData.stakingUser
        return {
            stakedBalance: formatBigNumber(user.stakedBalance),
            totalStaked: formatBigNumber(user.totalStaked),
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
    }, [userData])

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
        loading,
        cooldownPeriod,
        userRewards,
        refetchAll
    }
} 
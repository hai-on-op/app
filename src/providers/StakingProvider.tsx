import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'

import { useStoreState, useStoreActions } from '~/store'
import { useEthersSigner } from '~/hooks'
import { UserStakingData as ModelUserStakingData } from '~/model/stakingModel'

// GraphQL queries
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

// New query to fetch all staking users
const ALL_STAKING_USERS_QUERY = gql`
    query GetAllStakingUsers {
        stakingUsers(first: 1000) {
            id
            stakedBalance
            totalStaked
            totalWithdrawn
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

// Types
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
    status: string
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

// Helper function to format big numbers
function formatBigNumber(value: string): string {
    try {
        return formatEther(BigNumber.from(value))
    } catch {
        return '0'
    }
}

// Define context type
interface StakingContextType {
    stakingData: StakingData
    stakingStats: StakingStats
    stakedBalance: string
    totalStaked: string
    loading: boolean
    cooldownPeriod: string
    userRewards: Array<{
        id: number
        amount: BigNumber
        tokenAddress: string
    }>
    stakingApyData: Array<{ id: number; rpRate: BigNumber; rpToken: string }>
    refetchAll: (params: {
        stakingAmount?: string
        unstakingAmount?: string
        widthdrawAmount?: string
        cancelWithdrawalAmount?: string
    }) => Promise<void>
    usersStakingData: Record<string, ModelUserStakingData>
}

// Create context
const StakingContext = createContext<StakingContextType | undefined>(undefined)

// Provider component
export function StakingProvider({ children }: { children: React.ReactNode }) {
    const { address } = useAccount()

    const [isRefetching, setIsRefetching] = useState(false)
    const signer = useEthersSigner()
    const { stakingModel: stakingActions } = useStoreActions((actions) => actions)
    const cooldownPeriod = useStoreState((state) => state.stakingModel.cooldownPeriod)
    const totalStaked = useStoreState((state) => state.stakingModel.totalStaked)
    const userRewards = useStoreState((state) => state.stakingModel.userRewards)
    const stakingApyData = useStoreState((state) => state.stakingModel.stakingApyData)
    const stakedBalance = useStoreState((state) => state.stakingModel.stakedBalance)
    const usersStakingData = useStoreState((state) => state.stakingModel.usersStakingData)

    const {
        data: userData,
        loading: userLoading,
        refetch: refetchUser,
    } = useQuery(STAKING_USER_QUERY, {
        variables: { id: address?.toLowerCase() },
        skip: !address,
        fetchPolicy: 'network-only',
    })

    const {
        data: allUsersData,
        loading: allUsersLoading,
        refetch: refetchAllUsers,
    } = useQuery(ALL_STAKING_USERS_QUERY, {
        fetchPolicy: 'network-only',
    })

    const {
        data: statsData,
        loading: statsLoading,
        refetch: refetchStats,
    } = useQuery(STAKING_STATS_QUERY, {
        fetchPolicy: 'network-only',
    })

    // Process all users data and update the model
    useEffect(() => {
        if (allUsersData?.stakingUsers) {
            const modelUsersMap: Record<string, ModelUserStakingData> = {}

            allUsersData.stakingUsers.forEach((user: any) => {
                const formattedBalance = formatBigNumber(user.stakedBalance)

                modelUsersMap[user.id] = {
                    id: user.id,
                    stakedBalance: formattedBalance,
                    pendingWithdrawal: user.pendingWithdrawal
                        ? {
                              amount: Number(formatBigNumber(user.pendingWithdrawal.amount)),
                              timestamp: Number(user.pendingWithdrawal.timestamp),
                          }
                        : undefined,
                }
            })

            stakingActions.setUsersStakingData(modelUsersMap)
        }
    }, [allUsersData, stakingActions])

    // Simplified refetch function that avoids race conditions
    const refetchAll = async ({
        stakingAmount,
        unstakingAmount,
        widthdrawAmount,
        cancelWithdrawalAmount,
    }: {
        stakingAmount?: string
        unstakingAmount?: string
        widthdrawAmount?: string
        cancelWithdrawalAmount?: string
    } = {}) => {
        if (!signer || !address) return

        setIsRefetching(true)

        try {
            // Just refetch GraphQL data since optimistic updates are now handled in the model
            await Promise.all([refetchUser(), refetchAllUsers(), refetchStats()])
        } catch (error) {
            console.error('Error refetching staking data:', error)
        } finally {
            setIsRefetching(false)
        }
    }

    // Initial data fetch
    useEffect(() => {
        if (signer) {
            Promise.all([
                stakingActions.fetchCooldownPeriod({ signer }),
                stakingActions.fetchUserRewards({ signer }),
                stakingActions.fetchStakingApyData({ signer }),
                stakingActions.fetchTotalStaked({ signer }),
                stakingActions.fetchUserStakedBalance({ signer }),
            ])
        }
    }, [signer, stakingActions])

    // Simplified data merging that prioritizes model data
    const stakingData = useMemo((): StakingData => {
        // If address is not available or loading, return default
        if (!address) return defaultStakingData

        // Get user data from model (most up-to-date source)
        const userDataFromModel = usersStakingData[address.toLowerCase()]

        // If we have no data at all, return default
        if (!userDataFromModel && !userData?.stakingUser) {
            return defaultStakingData
        }

        // Merge data from model and GraphQL
        return {
            // Prefer model data for frequently updated fields
            stakedBalance:
                userDataFromModel?.stakedBalance ||
                (userData?.stakingUser?.stakedBalance ? formatBigNumber(userData.stakingUser.stakedBalance) : '0'),
            totalStaked: formatBigNumber(totalStaked),

            // Less frequently changed data from GraphQL
            totalWithdrawn: userData?.stakingUser?.totalWithdrawn
                ? formatBigNumber(userData.stakingUser.totalWithdrawn)
                : '0',
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

            // Prefer model data for pending withdrawal (most likely to be recently changed)
            pendingWithdrawal: userDataFromModel?.pendingWithdrawal
                ? {
                      id: 'pending-' + address.toLowerCase(),
                      amount: String(userDataFromModel.pendingWithdrawal.amount),
                      timestamp: userDataFromModel.pendingWithdrawal.timestamp,
                      status: 'PENDING',
                  }
                : userData?.stakingUser?.pendingWithdrawal
                ? {
                      ...userData.stakingUser.pendingWithdrawal,
                      amount: formatBigNumber(userData.stakingUser.pendingWithdrawal.amount),
                      timestamp: Number(userData.stakingUser.pendingWithdrawal.timestamp),
                  }
                : undefined,
        }
    }, [userData, totalStaked, usersStakingData, address])

    const stakingStats = useMemo((): StakingStats => {
        if (!statsData?.stakingStatistic) return defaultStakingStats

        const stats = statsData.stakingStatistic
        return {
            totalStaked: formatBigNumber(stats.totalStaked),
            totalStakers: stats.totalStakers.toString(),
            totalRewardsPaid: formatBigNumber(stats.totalRewardsPaid),
        }
    }, [statsData])

    const loading = userLoading || statsLoading || allUsersLoading

    return (
        <StakingContext.Provider
            value={{
                stakingData,
                stakingStats,
                stakedBalance,
                totalStaked,
                loading,
                cooldownPeriod,
                userRewards,
                stakingApyData,
                refetchAll,
                usersStakingData
            }}
        >
            {children}
        </StakingContext.Provider>
    )
}

// Hook for using the staking context
export function useStaking() {
    const context = useContext(StakingContext)
    if (context === undefined) {
        throw new Error('useStaking must be used within a StakingProvider')
    }
    return context
}

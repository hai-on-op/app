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
}

// Create context
const StakingContext = createContext<StakingContextType | undefined>(undefined)

// Provider component
export function StakingProvider({ children }: { children: React.ReactNode }) {
    const { address } = useAccount()

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
    const usersStakingData = useStoreState((state) => state.stakingModel.usersStakingData)

    console.log(usersStakingData)
    const {
        data: userData,
        loading: userLoading,
        refetch: refetchUser,
    } = useQuery(STAKING_USER_QUERY, {
        variables: { id: address?.toLowerCase() },
        skip: !address,
        fetchPolicy: 'network-only', // Don't cache this data, always fetch fresh
    })

    const {
        data: allUsersData,
        loading: allUsersLoading,
        refetch: refetchAllUsers,
    } = useQuery(ALL_STAKING_USERS_QUERY, {
        fetchPolicy: 'network-only', // Don't cache this data, always fetch fresh
    })

    const {
        data: statsData,
        loading: statsLoading,
        refetch: refetchStats,
    } = useQuery(STAKING_STATS_QUERY, {
        fetchPolicy: 'network-only', // Don't cache this data, always fetch fresh
    })

    // Process all users data and update the model
    useEffect(() => {
        if (allUsersData?.stakingUsers) {
            const modelUsersMap: Record<string, ModelUserStakingData> = {}

            allUsersData.stakingUsers.forEach((user: any) => {
                const formattedBalance = formatBigNumber(user.stakedBalance)

                // Create a compatible model user entry
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

            // Update the staking model with this data
            stakingActions.setUsersStakingData(modelUsersMap)
        }
    }, [allUsersData, stakingActions])

    // Handles both immediate updates after transactions and scheduled refetches
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
        if (signer && address) {
            console.log('Refetching all staking data', {
                stakingAmount,
                unstakingAmount,
                widthdrawAmount,
                cancelWithdrawalAmount,
            })
            const userAddressLower = address.toLowerCase()

            if (stakingAmount) {
                stakingActions.setTotalStaked(String(Number(totalStaked) + Number(stakingAmount)))
                stakingActions.setStakedBalance(String(Number(stakedBalance) + Number(stakingAmount)))

                // Update user in the model
                if (usersStakingData[userAddressLower]) {
                    const newBalance = String(
                        Number(usersStakingData[userAddressLower].stakedBalance) + Number(stakingAmount)
                    )
                    stakingActions.updateUserStakingData({
                        userId: userAddressLower,
                        data: {
                            stakedBalance: newBalance,
                        },
                    })
                }
            }
            if (unstakingAmount) {
                stakingActions.setTotalStaked(String(Number(totalStaked) - Number(unstakingAmount)))
                stakingActions.setStakedBalance(String(Number(stakedBalance) - Number(unstakingAmount)))
                stakingActions.setPendingWithdrawals([
                    {
                        amount: Number(unstakingAmount),
                        timestamp: Math.floor(Date.now() / 1000),
                    },
                ])

                // Update user in the model
                if (usersStakingData[userAddressLower]) {
                    const newBalance = String(
                        Number(usersStakingData[userAddressLower].stakedBalance) - Number(unstakingAmount)
                    )
                    stakingActions.updateUserStakingData({
                        userId: userAddressLower,
                        data: {
                            stakedBalance: newBalance,
                            pendingWithdrawal: {
                                amount: Number(unstakingAmount),
                                timestamp: Math.floor(Date.now() / 1000),
                            },
                        },
                    })
                }
            }
            if (widthdrawAmount) {
                stakingActions.setPendingWithdrawals([])

                // Update user in the model
                if (usersStakingData[userAddressLower]) {
                    stakingActions.updateUserStakingData({
                        userId: userAddressLower,
                        data: {
                            pendingWithdrawal: undefined,
                        },
                    })
                }
            }
            if (cancelWithdrawalAmount) {
                stakingActions.setTotalStaked(String(Number(totalStaked) + Number(cancelWithdrawalAmount)))
                stakingActions.setStakedBalance(String(Number(stakedBalance) + Number(cancelWithdrawalAmount)))

                // Update user in the model
                if (usersStakingData[userAddressLower]) {
                    const newBalance = String(
                        Number(usersStakingData[userAddressLower].stakedBalance) + Number(cancelWithdrawalAmount)
                    )
                    stakingActions.updateUserStakingData({
                        userId: userAddressLower,
                        data: {
                            stakedBalance: newBalance,
                            pendingWithdrawal: undefined,
                        },
                    })
                }
            }

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
                    refetchAllUsers(),
                    refetchStats(),
                    stakingActions.fetchCooldownPeriod({ signer }),
                    stakingActions.fetchUserRewards({ signer }),
                    stakingActions.fetchStakingApyData({ signer }),
                ])

                // Schedule another refetch after a delay to ensure subgraph is updated
                refetchTimeoutRef.current = window.setTimeout(async () => {
                    console.log('Delayed refetch to ensure GraphQL data is updated')
                    await Promise.all([refetchUser(), refetchAllUsers(), refetchStats()])
                    pendingTransactionRef.current = false
                    setLocalStakedBalance(null) // Clear local override after GraphQL is updated
                }, 15000) // 15 second delay for subgraph indexing
            } catch (error) {
                console.error('Error refetching staking data:', error)
                pendingTransactionRef.current = false
            }
        }
    }

    // Initial data fetch
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

    // Use the current user's data from the model's users mapping if available,
    // otherwise fall back to the individual query data
    const stakingData = useMemo((): StakingData => {
        if (address && usersStakingData[address.toLowerCase()] && !pendingTransactionRef.current) {
            const userDataFromModel = usersStakingData[address.toLowerCase()]

            return {
                stakedBalance: userDataFromModel.stakedBalance,
                totalStaked: formatBigNumber(totalStaked),
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
                pendingWithdrawal: userDataFromModel.pendingWithdrawal
                    ? {
                          id: 'pending-' + address.toLowerCase(),
                          amount: String(userDataFromModel.pendingWithdrawal.amount),
                          timestamp: userDataFromModel.pendingWithdrawal.timestamp,
                          status: 'PENDING',
                      }
                    : undefined,
            }
        }

        // Fall back to original logic
        if (!userData?.stakingUser && !localStakedBalance) return defaultStakingData

        // If we have a local staked balance from a recent transaction, use it
        // This ensures we show the updated balance immediately after a transaction
        if (localStakedBalance && pendingTransactionRef.current) {
            return {
                stakedBalance: localStakedBalance,
                totalStaked: formatBigNumber(totalStaked),
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
                pendingWithdrawal: userData?.stakingUser?.pendingWithdrawal
                    ? {
                          ...userData.stakingUser.pendingWithdrawal,
                          amount: formatBigNumber(userData.stakingUser.pendingWithdrawal.amount),
                          timestamp: Number(userData.stakingUser.pendingWithdrawal.timestamp),
                      }
                    : undefined,
            }
        }

        if (!userData?.stakingUser) return defaultStakingData

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
    }, [
        userData,
        refetchCounter,
        localStakedBalance,
        pendingTransactionRef.current,
        totalStaked,
        usersStakingData,
        address,
    ])

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

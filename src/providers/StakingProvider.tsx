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
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
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
    pendingWithdrawals: Record<
        string,
        {
            amount: number
            timestamp: number
            status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
        } | null
    >
}

// Create context
const StakingContext = createContext<StakingContextType | undefined>(undefined)

// Provider component
export function StakingProvider({ children }: { children: React.ReactNode }) {
    const { address } = useAccount()

    const [isRefetching, setIsRefetching] = useState(false)
    const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false)
    const signer = useEthersSigner()
    const { stakingModel: stakingActions } = useStoreActions((actions) => actions)
    const cooldownPeriod = useStoreState((state) => state.stakingModel.cooldownPeriod)
    const totalStaked = useStoreState((state) => state.stakingModel.totalStaked)
    const userRewards = useStoreState((state) => state.stakingModel.userRewards)
    const stakingApyData = useStoreState((state) => state.stakingModel.stakingApyData)
    const stakedBalance = useStoreState((state) => state.stakingModel.stakedBalance)
    const usersStakingData = useStoreState((state) => state.stakingModel.usersStakingData)
    const pendingWithdrawals = useStoreState((state) => state.stakingModel.pendingWithdrawals)
    const { setPendingWithdrawals } = useStoreActions((actions) => actions.stakingModel)

    // Track when the signer is first available
    const signerInitialized = useRef(false)

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
            const pendingWithdrawalsMap: Record<
                string,
                {
                    amount: number
                    timestamp: number
                    status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
                } | null
            > = {}

            allUsersData.stakingUsers.forEach((user: any) => {
                const formattedBalance = formatBigNumber(user.stakedBalance)
                const userId = user.id.toLowerCase()

                modelUsersMap[userId] = {
                    id: userId,
                    stakedBalance: formattedBalance,
                }

                if (user.pendingWithdrawal) {
                    pendingWithdrawalsMap[userId] = {
                        amount: Number(formatBigNumber(user.pendingWithdrawal.amount)),
                        timestamp: Number(user.pendingWithdrawal.timestamp),
                        status: user.pendingWithdrawal.status || 'PENDING',
                    }
                } else {
                    pendingWithdrawalsMap[userId] = null
                }
            })

            stakingActions.setUsersStakingData(modelUsersMap)
            setPendingWithdrawals(pendingWithdrawalsMap)
        }
    }, [allUsersData, stakingActions, setPendingWithdrawals])

    // Initial data fetch - only run once when signer becomes available
    useEffect(() => {
        async function loadInitialData() {
            if (signer && !signerInitialized.current) {
                signerInitialized.current = true
                try {
                    await Promise.all([
                        stakingActions.fetchCooldownPeriod({ signer }),
                        stakingActions.fetchUserRewards({ signer }),
                        stakingActions.fetchStakingApyData({ signer }),
                        stakingActions.fetchTotalStaked({ signer }),
                        stakingActions.fetchUserStakedBalance({ signer }),
                    ])
                    setIsInitialDataLoaded(true)
                } catch (error) {
                    console.error('Error loading initial staking data:', error)
                    // Reset the flag to try again
                    signerInitialized.current = false
                }
            }
        }

        loadInitialData()
    }, [signer, stakingActions])

    // Reset initialization flag when signer changes
    useEffect(() => {
        if (!signer) {
            signerInitialized.current = false
            setIsInitialDataLoaded(false)
        }
    }, [signer])

    // Simplified data merging that prioritizes model data
    const stakingData = useMemo((): StakingData => {
        if (!address) return defaultStakingData

        const userDataFromModel = usersStakingData[address.toLowerCase()]
        const userPendingWithdrawal = pendingWithdrawals[address.toLowerCase()]

        if (!userDataFromModel && !userData?.stakingUser) {
            return defaultStakingData
        }

        return {
            stakedBalance:
                userDataFromModel?.stakedBalance ||
                (userData?.stakingUser?.stakedBalance ? formatBigNumber(userData.stakingUser.stakedBalance) : '0'),
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
            pendingWithdrawal: userPendingWithdrawal
                ? {
                      id: 'pending-' + address.toLowerCase(),
                      amount: String(userPendingWithdrawal.amount),
                      timestamp: userPendingWithdrawal.timestamp,
                      status: userPendingWithdrawal.status,
                  }
                : undefined,
        }
    }, [userData, totalStaked, usersStakingData, pendingWithdrawals, address])

    const stakingStats = useMemo((): StakingStats => {
        if (!statsData?.stakingStatistic) return defaultStakingStats

        const stats = statsData.stakingStatistic
        return {
            totalStaked: formatBigNumber(stats.totalStaked),
            totalStakers: stats.totalStakers.toString(),
            totalRewardsPaid: formatBigNumber(stats.totalRewardsPaid),
        }
    }, [statsData])

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

            // Also refresh contract data
            if (signer) {
                await Promise.all([
                    stakingActions.fetchTotalStaked({ signer }),
                    stakingActions.fetchUserStakedBalance({ signer }),
                    stakingActions.fetchUserRewards({ signer }),
                ])
            }
        } catch (error) {
            console.error('Error refetching staking data:', error)
        } finally {
            setIsRefetching(false)
        }
    }

    // Improved loading logic that accounts for initial data loading
    const loading = (userLoading || statsLoading || allUsersLoading || !isInitialDataLoaded) && !isRefetching

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
                usersStakingData,
                pendingWithdrawals,
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

import { type Action, type Thunk, action, thunk } from 'easy-peasy'
import { JsonRpcSigner, TransactionResponse } from '@ethersproject/providers'
import { BigNumber, Contract } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import * as ethers from 'ethers'

import { type StoreModel } from './index'
import { ActionState } from '~/utils'
import { handlePreTxGasEstimate } from '~/hooks'
import StakingManagerABI from '~/abis/StakingManager.json'
import RewardPoolABI from '~/abis/RewardPool.json'

const ERC20ABI = [
    {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
]

// User staking data interface
export interface UserStakingData {
    id: string
    stakedBalance: string
    pendingWithdrawal?: {
        amount: number
        timestamp: number
    }
}

export interface StakingModel {
    stakedAmount: string
    totalStaked: string
    setTotalStaked: Action<StakingModel, string>
    fetchTotalStaked: Thunk<StakingModel, { signer: JsonRpcSigner }, any, StoreModel>

    // Add stakedBalance to track user's staked amount
    stakedBalance: string
    setStakedBalance: Action<StakingModel, string>
    fetchUserStakedBalance: Thunk<StakingModel, { signer: JsonRpcSigner }, BigNumber, StoreModel>

    // Users mapping to store all users' staking data
    usersStakingData: Record<string, UserStakingData>
    setUsersStakingData: Action<StakingModel, Record<string, UserStakingData>>
    updateUserStakingData: Action<StakingModel, { userId: string; data: Partial<UserStakingData> }>

    pendingWithdrawals: Array<{
        amount: number
        timestamp: number
    }>
    setPendingWithdrawals: Action<StakingModel, Array<{ amount: number; timestamp: number }>>

    // Optimistic state tracking
    isOptimistic: boolean
    optimisticData: {
        stakedBalance?: string
        totalStaked?: string
        pendingWithdrawal?: {
            amount: number
            timestamp: number
        }
    }
    setOptimisticState: Action<StakingModel, boolean>
    setOptimisticData: Action<StakingModel, Partial<StakingModel['optimisticData']>>
    clearOptimisticData: Action<StakingModel>

    // Enhanced existing functions
    applyOptimisticStake: Action<StakingModel, { amount: string; userAddress: string }>
    applyOptimisticUnstake: Action<StakingModel, { amount: string; userAddress: string }>
    applyOptimisticWithdraw: Action<StakingModel, { userAddress: string }>
    applyOptimisticCancelWithdrawal: Action<StakingModel, { amount: string; userAddress: string }>

    stake: Thunk<StakingModel, { signer: JsonRpcSigner; amount: string }, any, StoreModel>
    unstake: Thunk<StakingModel, { signer: JsonRpcSigner; amount: string }, any, StoreModel>
    withdraw: Thunk<StakingModel, { signer: JsonRpcSigner }, any, StoreModel>
    getReward: Thunk<StakingModel, { signer: JsonRpcSigner }, any, StoreModel>
    cancelWithdrawal: Thunk<StakingModel, { signer: JsonRpcSigner }, any, StoreModel>

    transactionState: ActionState
    setTransactionState: Action<StakingModel, ActionState>

    cooldownPeriod: string
    setCooldownPeriod: Action<StakingModel, string>
    fetchCooldownPeriod: Thunk<StakingModel, { signer: JsonRpcSigner }, any, StoreModel>

    userRewards: Array<{
        id: number
        amount: BigNumber
        tokenAddress: string
    }>
    setUserRewards: Action<StakingModel, Array<{ id: number; amount: BigNumber; tokenAddress: string }>>
    fetchUserRewards: Thunk<StakingModel, { signer: JsonRpcSigner }, any, StoreModel>

    stakingApyData: Array<{ id: number; rpRate: BigNumber; rpToken: string }>
    setStakingApyData: Action<StakingModel, Array<{ id: number; rpRate: BigNumber; rpToken: string }>>
    fetchStakingApyData: Thunk<StakingModel, { signer: JsonRpcSigner }, any, StoreModel>
}

// Helper function for retrying async operations
async function retryAsync<T>(fn: () => Promise<T>, retries = 5, delayMs = 30000): Promise<T> {
    let lastError: any
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastError = err
            if (attempt < retries - 1) {
                await new Promise((res) => setTimeout(res, delayMs))
            }
        }
    }
    throw lastError
}

export const stakingModel: StakingModel = {
    stakedAmount: '0',
    totalStaked: '0',
    setTotalStaked: action((state, payload) => {
        state.totalStaked = payload
    }),

    stakedBalance: '0',
    setStakedBalance: action((state, payload) => {
        state.stakedBalance = payload
    }),

    // Initialize empty users mapping
    usersStakingData: {},
    setUsersStakingData: action((state, payload) => {
        state.usersStakingData = payload
    }),
    updateUserStakingData: action((state, { userId, data }) => {
        state.usersStakingData[userId] = {
            ...(state.usersStakingData[userId] || { id: userId, stakedBalance: '0' }),
            ...data,
        }
    }),

    pendingWithdrawals: [],
    setPendingWithdrawals: action((state, payload) => {
        state.pendingWithdrawals = payload
    }),

    // Initialize optimistic state
    isOptimistic: false,
    optimisticData: {},

    setOptimisticState: action((state, payload) => {
        state.isOptimistic = payload
    }),

    setOptimisticData: action((state, payload) => {
        state.optimisticData = { ...state.optimisticData, ...payload }
    }),

    clearOptimisticData: action((state) => {
        state.optimisticData = {}
        state.isOptimistic = false
    }),

    // Apply optimistic updates immediately
    applyOptimisticStake: action((state, { amount, userAddress }) => {
        const numAmount = Number(amount)
        const lowerCaseAddress = userAddress.toLowerCase()

        // Calculate new values
        const newTotalStaked = String(Number(state.totalStaked) + numAmount)
        const newUserBalance = String(
            Number(state.usersStakingData[lowerCaseAddress]?.stakedBalance || '0') + numAmount
        )

        // Set optimistic flag and data
        state.isOptimistic = true
        state.optimisticData = {
            ...state.optimisticData,
            totalStaked: newTotalStaked,
            stakedBalance: newUserBalance,
        }

        // Apply changes immediately to state
        state.totalStaked = newTotalStaked
        if (state.usersStakingData[lowerCaseAddress]) {
            state.usersStakingData[lowerCaseAddress].stakedBalance = newUserBalance
        }
    }),

    applyOptimisticUnstake: action((state, { amount, userAddress }) => {
        const numAmount = Number(amount)
        const lowerCaseAddress = userAddress.toLowerCase()

        // Calculate new values
        const newTotalStaked = String(Number(state.totalStaked) - numAmount)
        const newUserBalance = String(
            Number(state.usersStakingData[lowerCaseAddress]?.stakedBalance || '0') - numAmount
        )

        console.log(
            'Applying optimistic unstake',
            amount,
            userAddress,
            state.totalStaked,
            newTotalStaked,
            state.usersStakingData[lowerCaseAddress]?.stakedBalance,
            newUserBalance
        )

        // Set optimistic flag and data
        state.isOptimistic = true
        state.optimisticData = {
            ...state.optimisticData,
            totalStaked: newTotalStaked,
            stakedBalance: newUserBalance,
            pendingWithdrawal: {
                amount: numAmount,
                timestamp: Math.floor(Date.now() / 1000),
            },
        }

        // Apply changes immediately to state
        state.totalStaked = newTotalStaked
        if (state.usersStakingData[lowerCaseAddress]) {
            state.usersStakingData[lowerCaseAddress].stakedBalance = newUserBalance
            state.usersStakingData[lowerCaseAddress].pendingWithdrawal = {
                amount: numAmount,
                timestamp: Math.floor(Date.now() / 1000),
            }
        }
    }),

    applyOptimisticWithdraw: action((state, { userAddress }) => {
        const lowerCaseAddress = userAddress.toLowerCase()

        // Set optimistic flag
        state.isOptimistic = true

        // Apply changes immediately to state
        if (state.usersStakingData[lowerCaseAddress]) {
            state.usersStakingData[lowerCaseAddress].pendingWithdrawal = undefined
        }
    }),

    applyOptimisticCancelWithdrawal: action((state, { amount, userAddress }) => {
        const numAmount = Number(amount)
        const lowerCaseAddress = userAddress.toLowerCase()

        // Calculate new values
        const newTotalStaked = String(Number(state.totalStaked) + numAmount)
        const newUserBalance = String(
            Number(state.usersStakingData[lowerCaseAddress]?.stakedBalance || '0') + numAmount
        )

        console.log(
            'Applying optimistic cancel withdrawal',
            amount,
            userAddress,
            state.totalStaked,
            newTotalStaked,
            state.usersStakingData[lowerCaseAddress]?.stakedBalance,
            newUserBalance,
            state.usersStakingData[lowerCaseAddress]?.pendingWithdrawal
        )

        // Set optimistic flag and data
        state.isOptimistic = true
        state.optimisticData = {
            ...state.optimisticData,
            totalStaked: newTotalStaked,
            stakedBalance: newUserBalance,
            // Clear the pending withdrawal in optimistic data
            pendingWithdrawal: undefined
        }

        // Apply changes immediately to state
        state.totalStaked = newTotalStaked
        if (state.usersStakingData[lowerCaseAddress]) {
            state.usersStakingData[lowerCaseAddress].stakedBalance = newUserBalance
            state.usersStakingData[lowerCaseAddress].pendingWithdrawal = undefined
        }
    }),

    stake: thunk(async (actions, { signer, amount }, { getStoreActions }) => {
        // debugger
        const storeActions = getStoreActions()
        try {
            const userAddress = await signer.getAddress()

            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)

            const txData = await stakingManager.populateTransaction.stake(await signer.getAddress(), parseEther(amount))

            const tx = await handlePreTxGasEstimate(signer, txData)
            const txResponse = await signer.sendTransaction(tx)

            // Apply optimistic update immediately after user confirms

            console.log('Applying optimistic stake', amount, userAddress)
            actions.applyOptimisticStake({ amount, userAddress })

            storeActions.transactionsModel.addTransaction({
                chainId: await signer.getChainId(),
                hash: txResponse.hash,
                from: txResponse.from,
                summary: 'Staking KITE',
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })

            storeActions.popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: ActionState.SUCCESS,
            })

            await txResponse.wait()

            // Transaction successful, now get real data
            await actions.fetchTotalStaked({ signer })
            await actions.fetchUserStakedBalance({ signer })

            // Keep optimistic flag for a while until GraphQL is updated
            setTimeout(() => {
                actions.clearOptimisticData()
            }, 5000) // Give subgraph time to update

            return txResponse
        } catch (error) {
            console.error('Staking error:', error)
            // Transaction failed, revert optimistic updates
            actions.clearOptimisticData()
            // Re-fetch actual data
            await actions.fetchTotalStaked({ signer })
            await actions.fetchUserStakedBalance({ signer })
            throw error
        }
    }),

    unstake: thunk(async (actions, { signer, amount }, { getStoreActions }) => {
        const storeActions = getStoreActions()
        try {
            const userAddress = await signer.getAddress()
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)
            const txData = await stakingManager.populateTransaction.initiateWithdrawal(parseEther(amount))
            const tx = await handlePreTxGasEstimate(signer, txData)
            
            // Apply optimistic update immediately after user confirms but before sending transaction
            console.log('Applying optimistic unstake', amount, userAddress)
            actions.applyOptimisticUnstake({ amount, userAddress })
            
            const txResponse = await signer.sendTransaction(tx)

            storeActions.transactionsModel.addTransaction({
                chainId: await signer.getChainId(),
                hash: txResponse.hash,
                from: txResponse.from,
                summary: 'Unstaking KITE',
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })

            storeActions.popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: ActionState.SUCCESS,
            })

            await txResponse.wait()

            // Transaction successful, now get real data
            await actions.fetchTotalStaked({ signer })
            await actions.fetchUserStakedBalance({ signer })

            // Keep optimistic flag for a while until GraphQL is updated
            setTimeout(() => {
                actions.clearOptimisticData()
            }, 5000) // Give subgraph time to update

            return txResponse
        } catch (error) {
            console.error('Unstaking error:', error)
            // Transaction failed, revert optimistic updates
            actions.clearOptimisticData()
            // Re-fetch actual data
            await actions.fetchTotalStaked({ signer })
            await actions.fetchUserStakedBalance({ signer })
            throw error
        }
    }),

    withdraw: thunk(async (actions, { signer }, { getStoreActions }) => {
        const storeActions = getStoreActions()
        try {
            const userAddress = await signer.getAddress()
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)
            const txData = await stakingManager.populateTransaction.withdraw()
            const tx = await handlePreTxGasEstimate(signer, txData)
            
            // Apply optimistic update immediately after user confirms but before sending transaction
            console.log('Applying optimistic withdraw', userAddress)
            actions.applyOptimisticWithdraw({ userAddress })
            
            const txResponse = await signer.sendTransaction(tx)

            storeActions.transactionsModel.addTransaction({
                chainId: await signer.getChainId(),
                hash: txResponse.hash,
                from: txResponse.from,
                summary: 'Withdrawing KITE',
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })

            storeActions.popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: ActionState.SUCCESS,
            })

            await txResponse.wait()

            // Transaction successful, now get real data
            await actions.fetchTotalStaked({ signer })
            await actions.fetchUserStakedBalance({ signer })

            // Keep optimistic flag for a while until GraphQL is updated
            setTimeout(() => {
                actions.clearOptimisticData()
            }, 5000) // Give subgraph time to update

            return txResponse
        } catch (error) {
            console.error('Withdrawal error:', error)
            // Transaction failed, revert optimistic updates
            actions.clearOptimisticData()
            // Re-fetch actual data
            await actions.fetchTotalStaked({ signer })
            await actions.fetchUserStakedBalance({ signer })
            throw error
        }
    }),

    cancelWithdrawal: thunk(async (actions, { signer }, { getStoreActions, getState }) => {
        const storeActions = getStoreActions()
        try {
            const userAddress = await signer.getAddress()
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)

            // Get the pending withdrawal amount before transaction
            let pendingAmount = '0'
            const currentState = getState()
            const userData = currentState.usersStakingData[userAddress.toLowerCase()]
            if (userData?.pendingWithdrawal?.amount) {
                pendingAmount = String(userData.pendingWithdrawal.amount)
            }

            const txData = await stakingManager.populateTransaction.cancelWithdrawal()
            const tx = await handlePreTxGasEstimate(signer, txData)
            
            // Apply optimistic update immediately after user confirms but before sending transaction
            console.log('Applying optimistic cancel withdrawal', pendingAmount, userAddress)
            actions.applyOptimisticCancelWithdrawal({ amount: pendingAmount, userAddress })
            
            const txResponse = await signer.sendTransaction(tx)

            storeActions.transactionsModel.addTransaction({
                chainId: await signer.getChainId(),
                hash: txResponse.hash,
                from: txResponse.from,
                summary: 'Cancel Withdrawal',
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })

            storeActions.popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: ActionState.SUCCESS,
            })

            await txResponse.wait()

            // Transaction successful, now get real data
            await actions.fetchTotalStaked({ signer })
            await actions.fetchUserStakedBalance({ signer })

            // Keep optimistic flag for a while until GraphQL is updated
            setTimeout(() => {
                actions.clearOptimisticData()
            }, 5000) // Give subgraph time to update

            return txResponse
        } catch (error) {
            console.error('Cancel withdrawal error:', error)
            // Transaction failed, revert optimistic updates
            actions.clearOptimisticData()
            // Re-fetch actual data
            await actions.fetchTotalStaked({ signer })
            await actions.fetchUserStakedBalance({ signer })
            throw error
        }
    }),

    transactionState: ActionState.NONE,
    setTransactionState: action((state, payload) => {
        state.transactionState = payload
    }),

    cooldownPeriod: '1814400', // Default 21 days in seconds
    setCooldownPeriod: action((state, payload) => {
        state.cooldownPeriod = payload
    }),

    fetchCooldownPeriod: thunk(async (actions, { signer }) => {
        await retryAsync(async () => {
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)
            const params = await stakingManager._params()

            actions.setCooldownPeriod(params.toString())
        })
    }),

    userRewards: [],
    stakingApyData: [],
    setUserRewards: action((state, payload) => {
        state.userRewards = payload
    }),
    setStakingApyData: action((state, payload) => {
        state.stakingApyData = payload
    }),
    fetchTotalStaked: thunk(async (actions, { signer }) => {
        await retryAsync(async () => {
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)
            const totalStaked = await stakingManager.totalStaked()
            actions.setTotalStaked(totalStaked.toString())
        })
    }),
    fetchStakingApyData: thunk(async (actions, { signer }) => {
        await retryAsync(async () => {
            const apyData = []
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)
            const stakingManagerTotalStaked = await stakingManager.totalStaked()
            const rewardsCountBigNum = await stakingManager.rewards()
            const rewardsCount = rewardsCountBigNum.toNumber()
            for (let i = 0; i < rewardsCount; i++) {
                const poolData = await stakingManager.rewardTypes(i)
                const { isActive } = poolData
                if (isActive) {
                    const rpContract = new Contract(poolData.rewardPool, RewardPoolABI, signer)
                    const rpRate = await rpContract.rewardRate()
                    apyData.push({
                        id: i,
                        rpRate: rpRate,
                        rpToken: poolData.rewardToken,
                    })
                }
            }
            actions.setStakingApyData(apyData)
        })
    }),

    fetchUserRewards: thunk(async (actions, { signer }) => {
        await retryAsync(async () => {
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)
            const address = await signer.getAddress()
            const stakingManagerTotalStaked = await stakingManager.totalStaked()
            const rewardsCountBigNum = await stakingManager.rewards()
            const rewardsCount = rewardsCountBigNum.toNumber()

            const activePools = []
            const activePoolIndexes: number[] = []
            for (let i = 0; i < rewardsCount; i++) {
                const poolData = await stakingManager.rewardTypes(i)
                const { isActive } = poolData
                if (isActive) {
                    const rpContract = new Contract(poolData.rewardPool, RewardPoolABI, signer)
                    const rpRate = await rpContract.rewardRate()
                    const rpTotalStaked = await rpContract.totalStaked()
                    const ratePerStakedToken = rpRate.div(stakingManagerTotalStaked)
                    activePools.push({ ...poolData, index: i })
                    activePoolIndexes.push(i)
                }
            }
            const rewardPools = await stakingManager.callStatic.earned(address)
            const aggregatedRewards: Record<string, ethers.BigNumber> = {}
            for (let i = 0; i < activePoolIndexes.length; i++) {
                const poolIndex = activePoolIndexes[i]
                const { rewardToken, rewardAmount } = rewardPools[poolIndex]
                if (rewardAmount && rewardAmount.gt(0)) {
                    if (aggregatedRewards[rewardToken]) {
                        aggregatedRewards[rewardToken] = aggregatedRewards[rewardToken].add(rewardAmount)
                    } else {
                        aggregatedRewards[rewardToken] = rewardAmount
                    }
                }
            }
            const finalRewardsState: Array<{ id: number; amount: BigNumber; tokenAddress: string }> = Object.entries(
                aggregatedRewards
            ).map(([tokenAddress, totalAmountBigNum], index) => {
                return {
                    id: index,
                    amount: totalAmountBigNum,
                    tokenAddress: tokenAddress,
                }
            })
            actions.setUserRewards(finalRewardsState)
        })
    }),

    fetchUserStakedBalance: thunk(async (actions, { signer }) => {
        await retryAsync(async () => {
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_TOKEN_ADDRESS, ERC20ABI, signer)
            const userAddress = await signer.getAddress()
            const balance = await stakingManager.balanceOf(userAddress)

            console.log('fetchUserStakedBalance', String(balance))

            // Update both the single user state and the mapping
            actions.setStakedBalance(ethers.utils.formatEther(balance))
            actions.updateUserStakingData({
                userId: userAddress.toLowerCase(),
                data: {
                    stakedBalance: ethers.utils.formatEther(balance),
                },
            })

            return balance
        })
    }),

    getReward: thunk(async (actions, { signer }, { getStoreActions }) => {
        const storeActions = getStoreActions()
        try {
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)

            const txData = await stakingManager.populateTransaction.getReward(await signer.getAddress())

            const tx = await handlePreTxGasEstimate(signer, txData)
            const txResponse = await signer.sendTransaction(tx)

            storeActions.transactionsModel.addTransaction({
                chainId: await signer.getChainId(),
                hash: txResponse.hash,
                from: txResponse.from,
                summary: 'Claiming Rewards',
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })

            storeActions.popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: ActionState.SUCCESS,
            })

            await txResponse.wait()
            actions.fetchUserRewards({ signer }) // Refresh rewards after claim
            return txResponse
        } catch (error) {
            console.error('Reward claim error:', error)
            throw error
        }
    }),
}

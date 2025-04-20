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

export interface StakingModel {
    stakedAmount: string
    totalStaked: string
    setTotalStaked: Action<StakingModel, string>
    fetchTotalStaked: Thunk<StakingModel, { signer: JsonRpcSigner }, any, StoreModel>

    pendingWithdrawals: Array<{
        amount: number
        timestamp: number
    }>
    setPendingWithdrawals: Action<StakingModel, Array<{ amount: number; timestamp: number }>>

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
                await new Promise(res => setTimeout(res, delayMs))
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

    pendingWithdrawals: [],
    setPendingWithdrawals: action((state, payload) => {
        state.pendingWithdrawals = payload
    }),

    stake: thunk(async (actions, { signer, amount }, { getStoreActions }) => {
        // debugger
        const storeActions = getStoreActions()
        try {
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)

            const txData = await stakingManager.populateTransaction.stake(await signer.getAddress(), parseEther(amount))

            const tx = await handlePreTxGasEstimate(signer, txData)
            const txResponse = await signer.sendTransaction(tx)

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
            return txResponse
        } catch (error) {
            console.error('Staking error:', error)
            throw error
        }
    }),

    unstake: thunk(async (actions, { signer, amount }, { getStoreActions }) => {
        const storeActions = getStoreActions()
        try {
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)

            const txData = await stakingManager.populateTransaction.initiateWithdrawal(parseEther(amount))

            const tx = await handlePreTxGasEstimate(signer, txData)
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
            return txResponse
        } catch (error) {
            console.error('Unstaking error:', error)
            throw error
        }
    }),

    withdraw: thunk(async (actions, { signer }, { getStoreActions }) => {
        const storeActions = getStoreActions()
        try {
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)

            const txData = await stakingManager.populateTransaction.withdraw()

            const tx = await handlePreTxGasEstimate(signer, txData)
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
            return txResponse
        } catch (error) {
            console.error('Withdrawal error:', error)
            throw error
        }
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

    cancelWithdrawal: thunk(async (actions, { signer }, { getStoreActions }) => {
        const storeActions = getStoreActions()
        try {
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)

            const txData = await stakingManager.populateTransaction.cancelWithdrawal()

            const tx = await handlePreTxGasEstimate(signer, txData)
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
            return txResponse
        } catch (error) {
            console.error('Cancel withdrawal error:', error)
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
}


import { type Action, type Thunk, action, thunk } from 'easy-peasy'
import { JsonRpcSigner, TransactionResponse } from '@ethersproject/providers'
import { BigNumber, Contract } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import * as ethers from 'ethers'

import { type StoreModel } from './index'
import { ActionState } from '~/utils'
import { handlePreTxGasEstimate } from '~/hooks'
import StakingManagerABI from '~/abis/StakingManager.json'

export interface StakingModel {
    stakedAmount: string
    setStakedAmount: Action<StakingModel, string>

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
}

export const stakingModel: StakingModel = {
    stakedAmount: '0',
    setStakedAmount: action((state, payload) => {
        state.stakedAmount = payload
    }),

    pendingWithdrawals: [],
    setPendingWithdrawals: action((state, payload) => {
        state.pendingWithdrawals = payload
    }),

    stake: thunk(async (actions, { signer, amount }, { getStoreActions }) => {
        // debugger
        const storeActions = getStoreActions()
        try {
            console.log('stake', import.meta.env.VITE_STAKING_MANAGER, signer, amount)

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
        try {
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)
            const params = await stakingManager._params()
            actions.setCooldownPeriod(params.toString())
        } catch (error) {
            console.error('Error fetching cooldown period:', error)
        }
    }),

    userRewards: [],
    setUserRewards: action((state, payload) => {
        state.userRewards = payload
    }),

    fetchUserRewards: thunk(async (actions, { signer }) => {
        try {
            const stakingManager = new Contract(import.meta.env.VITE_STAKING_MANAGER, StakingManagerABI, signer)
            const address = await signer.getAddress()
            const rewardsCountBigNum = await stakingManager.rewards()
            const rewardsCount = rewardsCountBigNum.toNumber()

            const activePoolIndexes: number[] = []
            for (let i = 0; i < rewardsCount; i++) {
                const { isActive } = await stakingManager.rewardTypes(i)
                if (isActive) {
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
        } catch (error) {
            console.error('Error fetching user rewards via earned():', error)
            // Clear rewards on error
            actions.setUserRewards([])
        }
    }),
}

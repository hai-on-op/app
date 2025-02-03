import { type Action, type Thunk, action, thunk } from 'easy-peasy'
import { JsonRpcSigner, TransactionResponse } from '@ethersproject/providers'
import { Contract } from 'ethers'
import { parseEther } from 'ethers/lib/utils'

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

    transactionState: ActionState
    setTransactionState: Action<StakingModel, ActionState>
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
            return txResponse
        } catch (error) {
            console.error('Reward claim error:', error)
            throw error
        }
    }),

    transactionState: ActionState.NONE,
    setTransactionState: action((state, payload) => {
        state.transactionState = payload
    }),
}

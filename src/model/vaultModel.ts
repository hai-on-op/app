import { action, type Action, thunk, type Thunk } from 'easy-peasy'

import { StoreModel } from '~/model'
import { handleDepositAndBorrow, handleRepayAndWithdraw } from '~/services/blockchain'
import { fetchUserVaults } from '~/services/vaults'
import type {
    IFetchVaultsPayload,
    ILiquidationData,
    IVault,
    IVaultData,
    IVaultPayload,
} from '~/types'
import {
    ActionState,
    WrapEtherProps,
    handleWrapEther,
    timeout,
} from '~/utils'

export interface VaultModel {
    list: Array<IVault>
    vaultCreated: boolean
    singleVault?: IVault
    operation: number
    targetedCRatio: number
    totalEth: string
    isMaxWithdraw: boolean
    totalHAI: string
    amount: string
    isES: boolean
    isUniSwapPoolChecked: boolean
    stage: number
    transactionState: ActionState
    vaultData: IVaultData
    liquidationData?: ILiquidationData
    uniSwapPool: IVaultData
    depositAndBorrow: Thunk<VaultModel, IVaultPayload & { vaultId?: string }, any, StoreModel>
    repayAndWithdraw: Thunk<VaultModel, IVaultPayload & { vaultId: string }, any, StoreModel>
    fetchUserVaults: Thunk<VaultModel, IFetchVaultsPayload, any, StoreModel>
    // collectETH: Thunk<
    //     VaultModel,
    //     { signer: JsonRpcSigner; vault: IVault },
    //     any,
    //     StoreModel
    // >
    setIsVaultCreated: Action<VaultModel, boolean>
    setList: Action<VaultModel, Array<IVault>>
    setSingleVault: Action<VaultModel, IVault | undefined>
    setOperation: Action<VaultModel, number>
    setTotalEth: Action<VaultModel, string>
    setTotalHAI: Action<VaultModel, string>
    setIsES: Action<VaultModel, boolean>
    setLiquidationData: Action<VaultModel, ILiquidationData>
    setVaultData: Action<VaultModel, IVaultData>
    setUniSwapPool: Action<VaultModel, IVaultData>
    setIsUniSwapPoolChecked: Action<VaultModel, boolean>
    setStage: Action<VaultModel, number>
    setTransactionState: Action<VaultModel, ActionState>
    setAmount: Action<VaultModel, string>
    setTargetedCRatio: Action<VaultModel, number>
    setIsMaxWithdraw: Action<VaultModel, boolean>
    wrapEther: Thunk<VaultModel, WrapEtherProps, any, StoreModel>
}

const DEFAULT_VAULT_DATA: IVaultData = {
    totalCollateral: '',
    totalDebt: '',
    leftInput: '',
    rightInput: '',
    collateralRatio: 0,
    liquidationPrice: 0,
    collateral: '',
}

const vaultModel: VaultModel = {
    list: [],
    vaultCreated: false,
    isMaxWithdraw: false,
    operation: 0,
    amount: '',
    targetedCRatio: 0,
    singleVault: undefined,
    totalEth: '0.00',
    totalHAI: '0.00',
    transactionState: ActionState.NONE,
    isES: true,
    isUniSwapPoolChecked: true,
    stage: 0,
    vaultData: DEFAULT_VAULT_DATA,
    liquidationData: undefined,
    uniSwapPool: DEFAULT_VAULT_DATA,
    depositAndBorrow: thunk(async (actions, payload, { getStoreActions }) => {
        const storeActions = getStoreActions()
        const txResponse = await handleDepositAndBorrow(payload.signer, payload.vaultData, payload.vaultId)
        if (txResponse) {
            const { hash, chainId } = txResponse
            storeActions.transactionsModel.addTransaction({
                chainId,
                hash,
                from: txResponse.from,
                summary: payload.vaultId ? 'Modifying Vault' : 'Opening a new Vault',
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })
            storeActions.popupsModel.setIsWaitingModalOpen(true)
            if (!payload.vaultId) {
                storeActions.popupsModel.setWaitingPayload({
                    title: 'Transaction Submitted',
                    text: 'Adding a new vault...',
                    status: ActionState.SUCCESS,
                    isCreate: true,
                })
            } else {
                storeActions.popupsModel.setWaitingPayload({
                    title: 'Transaction Submitted',
                    hash: txResponse.hash,
                    status: ActionState.SUCCESS,
                })
            }

            await txResponse.wait()
            actions.setStage(0)
            actions.setUniSwapPool(DEFAULT_VAULT_DATA)
            actions.setVaultData(DEFAULT_VAULT_DATA)
            storeActions.connectWalletModel.setForceUpdateTokens(true)
        } else {
            storeActions.connectWalletModel.setIsStepLoading(false)
            storeActions.connectWalletModel.setStep(2)
        }
    }),
    repayAndWithdraw: thunk(async (actions, payload, { getStoreActions }) => {
        const storeActions = getStoreActions()
        const txResponse = await handleRepayAndWithdraw(payload.signer, payload.vaultData, payload.vaultId)
        if (txResponse) {
            const { hash, chainId } = txResponse
            storeActions.transactionsModel.addTransaction({
                chainId,
                hash,
                from: txResponse.from,
                summary: 'Modifying Vault',
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })
            storeActions.popupsModel.setIsWaitingModalOpen(true)
            storeActions.popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: ActionState.SUCCESS,
            })

            await txResponse.wait()
            actions.setStage(0)
            actions.setUniSwapPool(DEFAULT_VAULT_DATA)
            actions.setVaultData(DEFAULT_VAULT_DATA)
            storeActions.connectWalletModel.setForceUpdateTokens(true)
        }
    }),
    // collectETH: thunk(async (actions, payload, { getStoreActions }) => {
    //     const storeActions = getStoreActions()
    //     const txResponse = await handleCollectETH(payload.signer, payload.vault)
    //     if (txResponse) {
    //         const { hash, chainId } = txResponse
    //         storeActions.transactionsModel.addTransaction({
    //             chainId,
    //             hash,
    //             from: txResponse.from,
    //             summary: 'Collecting ETH',
    //             addedTime: new Date().getTime(),
    //             originalTx: txResponse,
    //         })
    //         storeActions.popupsModel.setIsWaitingModalOpen(true)
    //         storeActions.popupsModel.setWaitingPayload({
    //             title: 'Transaction Submitted',
    //             hash: txResponse.hash,
    //             status: 'success',
    //         })
    //         await txResponse.wait()
    //     }
    // }),
    fetchUserVaults: thunk(async (actions, payload, { getStoreActions, getState }) => {
        const storeActions = getStoreActions()
        const state = getState()
        const { transactionState } = state
        const fetched = await fetchUserVaults(payload)
        const chainId = payload.chainId

        if (fetched) {
            actions.setList(fetched.userVaults)
            if (fetched.userVaults.length > 0) {
                actions.setIsVaultCreated(true)
                storeActions.connectWalletModel.setStep(2)
            } else if (transactionState === ActionState.ERROR) {
                actions.setIsVaultCreated(false)
                storeActions.connectWalletModel.setIsStepLoading(false)
            } else {
                actions.setIsVaultCreated(false)
            }
            actions.setLiquidationData(fetched.liquidationData)

            if (fetched.availableHAI && chainId) {
                storeActions.connectWalletModel.updateHaiBalance({
                    chainId,
                    balance: fetched.availableHAI,
                })
            }
            await timeout(200)
            return fetched
        }
    }),

    wrapEther: thunk(async (actions, payload, { getStoreActions }) => {
        const storeActions = getStoreActions()
        const txResponse = await handleWrapEther(payload)
        if (txResponse) {
            const { hash, chainId } = txResponse
            storeActions.transactionsModel.addTransaction({
                chainId,
                hash,
                from: txResponse.from,
                summary: payload.title,
                addedTime: new Date().getTime(),
                originalTx: txResponse,
            })
            storeActions.popupsModel.setIsWaitingModalOpen(true)
            storeActions.popupsModel.setWaitingPayload({
                title: 'Transaction Submitted',
                hash: txResponse.hash,
                status: ActionState.SUCCESS,
            })
            await txResponse.wait()
        }
    }),

    setIsVaultCreated: action((state, payload) => {
        state.vaultCreated = payload
    }),
    setList: action((state, payload) => {
        state.list = payload
    }),
    setSingleVault: action((state, payload) => {
        state.singleVault = payload
    }),
    setOperation: action((state, payload) => {
        state.operation = payload
    }),
    setTotalEth: action((state, payload) => {
        state.totalEth = payload
    }),
    setTotalHAI: action((state, payload) => {
        state.totalHAI = payload
    }),
    setIsES: action((state, payload) => {
        state.isES = payload
    }),

    setLiquidationData: action((state, payload) => {
        state.liquidationData = payload
    }),

    setVaultData: action((state, payload) => {
        state.vaultData = payload
    }),
    setUniSwapPool: action((state, payload) => {
        state.uniSwapPool = payload
    }),
    setIsUniSwapPoolChecked: action((state, payload) => {
        state.isUniSwapPoolChecked = payload
    }),
    setStage: action((state, payload) => {
        state.stage = payload
    }),
    setTransactionState: action((state, payload) => {
        state.transactionState = payload
    }),
    setAmount: action((state, payload) => {
        state.amount = payload
    }),
    setTargetedCRatio: action((state, payload) => {
        state.targetedCRatio = payload
    }),
    setIsMaxWithdraw: action((state, payload) => {
        state.isMaxWithdraw = payload
    }),
}

export default vaultModel

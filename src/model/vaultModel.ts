import { type Action, type Thunk, action, thunk } from 'easy-peasy'

import { type StoreModel } from './index'
import {
    handleClaimFreeCollateral,
    handleDepositAndBorrow,
    handleDepositAndRepay,
    handleRepayAndWithdraw,
    handleWithdrawAndBorrow,
} from '~/services/blockchain'
import { fetchLiquidationData, fetchUserVaults } from '~/services/vaults'
import type {
    IFetchLiquidationDataPayload,
    IFetchVaultsPayload,
    ILiquidationData,
    IVault,
    IVaultData,
    IVaultPayload,
} from '~/types/vaults'
import { type WrapEtherProps, handleUnwrapEther, handleWrapEther } from '~/utils/wrapEther'
import { type WrapTokenProps, handleWrapToken } from '~/utils/wrapToken'
import { timeout } from '~/utils/time'
import { ActionState } from '~/utils/constants'

export interface VaultModel {
    list: Array<IVault>
    setList: Action<VaultModel, Array<IVault>>
    fetchLiquidationData: Thunk<VaultModel, IFetchLiquidationDataPayload, any, StoreModel>
    fetchUserVaults: Thunk<VaultModel, IFetchVaultsPayload, any, StoreModel>

    singleVault?: IVault
    setSingleVault: Action<VaultModel, IVault | undefined>

    vaultData: IVaultData
    setVaultData: Action<VaultModel, IVaultData>

    liquidationData?: ILiquidationData
    setLiquidationData: Action<VaultModel, ILiquidationData>

    // operation: number
    // setOperation: Action<VaultModel, number>

    amount: string
    setAmount: Action<VaultModel, string>

    // totalEth: string
    // setTotalEth: Action<VaultModel, string>
    // totalHAI: string
    // setTotalHAI: Action<VaultModel, string>

    // isMaxWithdraw: boolean
    // setIsMaxWithdraw: Action<VaultModel, boolean>

    // targetedCRatio: number
    // setTargetedCRatio: Action<VaultModel, number>

    // isES: boolean
    // setIsES: Action<VaultModel, boolean>

    // uniSwapPool: IVaultData
    // setUniSwapPool: Action<VaultModel, IVaultData>
    // isUniSwapPoolChecked: boolean
    // setIsUniSwapPoolChecked: Action<VaultModel, boolean>

    // stage: number
    // setStage: Action<VaultModel, number>

    claimFreeCollateral: Thunk<VaultModel, IVaultPayload & any, StoreModel>
    depositAndBorrow: Thunk<VaultModel, IVaultPayload & { vaultId?: string }, any, StoreModel>
    repayAndWithdraw: Thunk<VaultModel, IVaultPayload & { vaultId: string }, any, StoreModel>
    depositAndRepay: Thunk<VaultModel, IVaultPayload & { vaultId: string }, any, StoreModel>
    withdrawAndBorrow: Thunk<VaultModel, IVaultPayload & { vaultId: string }, any, StoreModel>
    // collectETH: Thunk<
    //     VaultModel,
    //     { signer: JsonRpcSigner; vault: IVault },
    //     any,
    //     StoreModel
    // >
    wrapToken: Thunk<VaultModel, WrapTokenProps & { title: string }, any, StoreModel>
    wrapEther: Thunk<VaultModel, WrapEtherProps & { title: string }, any, StoreModel>
    unwrapEther: Thunk<VaultModel, WrapEtherProps & { title: string }, any, StoreModel>

    transactionState: ActionState
    setTransactionState: Action<VaultModel, ActionState>
}

const DEFAULT_VAULT_DATA: IVaultData = {
    totalCollateral: '',
    totalDebt: '',
    deposit: '',
    withdraw: '',
    borrow: '',
    repay: '',
    collateralRatio: 0,
    liquidationPrice: 0,
    collateral: '',
}

const DEPRECATED_COLLATERALS: Array<string> = ['WBTC']

export const vaultModel: VaultModel = {
    list: [],
    setList: action((state, payload) => {
        state.list = payload.filter(
            ({ collateralName }) => !DEPRECATED_COLLATERALS.includes(collateralName.toUpperCase())
        )
    }),
    fetchLiquidationData: thunk(async (actions, payload) => {
        const data = await fetchLiquidationData(payload)

        actions.setLiquidationData(data)

        return data
    }),
    fetchUserVaults: thunk(async (actions, payload, { getStoreActions, getState }) => {
        const storeActions = getStoreActions()
        const state = getState()
        const { transactionState } = state
        const fetched = await fetchUserVaults(payload)
        const chainId = payload.chainId

        if (fetched) {
            actions.setList(fetched.userVaults)
            if (fetched.userVaults.length > 0) {
                storeActions.connectWalletModel.setStep(2)
            } else if (transactionState === ActionState.ERROR) {
                storeActions.connectWalletModel.setIsStepLoading(false)
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

    singleVault: undefined,
    setSingleVault: action((state, payload) => {
        state.singleVault = payload
    }),

    vaultData: DEFAULT_VAULT_DATA,
    setVaultData: action((state, payload) => {
        state.vaultData = payload
    }),

    liquidationData: undefined,
    setLiquidationData: action((state, payload) => {
        state.liquidationData = payload
    }),

    // operation: 0,
    // setOperation: action((state, payload) => {
    //     state.operation = payload
    // }),

    amount: '',
    setAmount: action((state, payload) => {
        state.amount = payload
    }),

    // totalEth: '0.00',
    // setTotalEth: action((state, payload) => {
    //     state.totalEth = payload
    // }),
    // totalHAI: '0.00',
    // setTotalHAI: action((state, payload) => {
    //     state.totalHAI = payload
    // }),

    // isMaxWithdraw: false,
    // setIsMaxWithdraw: action((state, payload) => {
    //     state.isMaxWithdraw = payload
    // }),

    // targetedCRatio: 0,
    // setTargetedCRatio: action((state, payload) => {
    //     state.targetedCRatio = payload
    // }),

    // isES: true,
    // setIsES: action((state, payload) => {
    //     state.isES = payload
    // }),

    // uniSwapPool: DEFAULT_VAULT_DATA,
    // setUniSwapPool: action((state, payload) => {
    //     state.uniSwapPool = payload
    // }),
    // isUniSwapPoolChecked: true,
    // setIsUniSwapPoolChecked: action((state, payload) => {
    //     state.isUniSwapPoolChecked = payload
    // }),

    // stage: 0,
    // setStage: action((state, payload) => {
    //     state.stage = payload
    // }),
    claimFreeCollateral: thunk(async (actions, payload, { getStoreActions }) => {
        const storeActions = getStoreActions()
        const txResponse = await handleClaimFreeCollateral(payload.signer, payload.vault)
        if (txResponse) {
            const { hash, chainId } = txResponse
            storeActions.transactionsModel.addTransaction({
                chainId,
                hash,
                from: txResponse.from,
                summary: 'Claiming Free Collateral',
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
            // actions.setStage(0)
            // actions.setUniSwapPool(DEFAULT_VAULT_DATA)
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
            // actions.setStage(0)
            // actions.setUniSwapPool(DEFAULT_VAULT_DATA)
            actions.setVaultData(DEFAULT_VAULT_DATA)
            storeActions.connectWalletModel.setForceUpdateTokens(true)
        }
    }),
    depositAndRepay: thunk(async (actions, payload, { getStoreActions }) => {
        const storeActions = getStoreActions()
        const txResponses = await handleDepositAndRepay(payload.signer, payload.vaultData, payload.vaultId)
        if (txResponses) {
            await Promise.all(
                txResponses.map(async (res) => {
                    if (!res) return
                    const { hash, chainId, from } = res
                    storeActions.transactionsModel.addTransaction({
                        chainId,
                        hash,
                        from,
                        summary: 'Modifying Vault',
                        addedTime: new Date().getTime(),
                        originalTx: res,
                    })
                    storeActions.popupsModel.setIsWaitingModalOpen(true)
                    storeActions.popupsModel.setWaitingPayload({
                        title: 'Transaction Submitted',
                        hash: hash,
                        status: ActionState.SUCCESS,
                    })

                    await res.wait()
                    return
                })
            )

            actions.setVaultData(DEFAULT_VAULT_DATA)
            storeActions.connectWalletModel.setForceUpdateTokens(true)
        }
    }),
    withdrawAndBorrow: thunk(async (actions, payload, { getStoreActions }) => {
        const storeActions = getStoreActions()
        const txResponses = await handleWithdrawAndBorrow(payload.signer, payload.vaultData, payload.vaultId)
        if (txResponses) {
            await Promise.all(
                txResponses.map(async (res) => {
                    if (!res) return
                    const { hash, chainId, from } = res
                    storeActions.transactionsModel.addTransaction({
                        chainId,
                        hash,
                        from,
                        summary: 'Modifying Vault',
                        addedTime: new Date().getTime(),
                        originalTx: res,
                    })
                    storeActions.popupsModel.setIsWaitingModalOpen(true)
                    storeActions.popupsModel.setWaitingPayload({
                        title: 'Transaction Submitted',
                        hash: hash,
                        status: ActionState.SUCCESS,
                    })

                    await res.wait()
                    return
                })
            )

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
    wrapToken: thunk(async (actions, payload, { getStoreActions }) => {
        const storeActions = getStoreActions()
        const txResponse = await handleWrapToken(payload)
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
    unwrapEther: thunk(async (actions, payload, { getStoreActions }) => {
        const storeActions = getStoreActions()
        const txResponse = await handleUnwrapEther(payload)
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

    transactionState: ActionState.NONE,
    setTransactionState: action((state, payload) => {
        state.transactionState = payload
    }),
}

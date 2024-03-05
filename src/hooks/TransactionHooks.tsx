import { useCallback, useMemo } from 'react'
import { type TransactionResponse, type TransactionRequest } from '@ethersproject/providers'
import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'
import { utils as gebUtils } from '@hai-on-op/sdk'
import { BigNumber } from 'ethers'
import { useAccount, useNetwork } from 'wagmi'

import type { ITransaction } from '~/types'
import { ActionState, newTransactionsFirst } from '~/utils'
import { store, useStoreDispatch, useStoreState } from '~/store'

type TransactionAdder = (
    response: TransactionResponse,
    summary?: string,
    approval?: {
        tokenAddress: string
        spender: string
    }
) => void

// adding transaction to store
export function useTransactionAdder(): TransactionAdder {
    const { chain } = useNetwork()
    const { address: account } = useAccount()
    const { transactionsModel: transactionsDispatch } = useStoreDispatch()

    return useCallback(
        (
            response: TransactionResponse,
            summary?: string,
            approval?: {
                tokenAddress: string
                spender: string
            }
        ) => {
            if (!account) return
            if (!chain?.id) return

            if (!response.hash) {
                throw Error('No transaction hash found.')
            }

            const tx: ITransaction = {
                chainId: chain.id,
                hash: response.hash,
                from: account,
                summary,
                addedTime: new Date().getTime(),
                originalTx: response,
                approval,
            }

            transactionsDispatch.addTransaction(tx)
        },
        [chain?.id, account, transactionsDispatch]
    )
}

// add 20%
export function calculateGasMargin(value: BigNumber): BigNumber {
    return value.mul(BigNumber.from(10_000 + 2_000)).div(BigNumber.from(10_000))
}

export function isTransactionRecent(tx: ITransaction): boolean {
    return new Date().getTime() - tx.addedTime < 86_400_000
}

export function useIsTransactionPending(transactionHash?: string): boolean {
    const { transactions } = useStoreState(({ transactionsModel }) => transactionsModel)

    if (!transactionHash || !transactions[transactionHash]) return false

    return !transactions[transactionHash].receipt
}

// handking transactions gas limit as well as error messages

export async function handlePreTxGasEstimate(
    signer: JsonRpcSigner,
    tx: TransactionRequest,
    floorGasLimit?: string | null
): Promise<TransactionRequest> {
    let gasLimit: BigNumber
    try {
        gasLimit = await signer.estimateGas(tx)
    } catch (err: any) {
        let gebError: string | null
        try {
            const res = await signer.call(tx)
            gebError = gebUtils.getRequireString(res)
        } catch (err) {
            gebError = gebUtils.getRequireString(err)
        }

        let errorMessage: string
        if (gebError) {
            errorMessage = 'Geb error: ' + gebError
        } else {
            errorMessage = 'Provider error: ' + (err?.message || err)
        }
        store.dispatch.popupsModel.setIsWaitingModalOpen(true)
        store.dispatch.popupsModel.setWaitingPayload({
            title: 'Transaction Failed.',
            status: ActionState.ERROR,
        })
        console.error(errorMessage)
        throw errorMessage
    }

    // Add 20% slack in the gas limit
    const gasPlus20Percent = gasLimit.mul(120).div(100)

    if (floorGasLimit) {
        const floorGasLimitBN = BigNumber.from(floorGasLimit)
        tx.gasLimit = floorGasLimitBN.gt(gasPlus20Percent) ? floorGasLimitBN : gasPlus20Percent
    } else {
        tx.gasLimit = gasPlus20Percent
    }

    return tx
}

export function handleTransactionError(e: any) {
    const { popupsModel: popupsDispatch } = store.dispatch

    if (typeof e === 'string' && (e.toLowerCase().includes('join') || e.toLowerCase().includes('exit'))) {
        popupsDispatch.setWaitingPayload({
            title: 'Cannot join/exit at this time.',
            status: ActionState.ERROR,
        })
        return
    }
    if (e?.code === 4001) {
        popupsDispatch.setWaitingPayload({
            title: 'Transaction Rejected.',
            status: ActionState.ERROR,
        })
        return
    }
    popupsDispatch.setWaitingPayload({
        title: 'Transaction Failed.',
        status: ActionState.ERROR,
    })
    console.error(`Transaction failed`, e)
    console.log('Required String', gebUtils.getRequireString(e))
}

export function useHasPendingTransactions() {
    const { transactions: allTransactions } = useStoreState(({ transactionsModel }) => transactionsModel)

    const sortedRecentTransactions = useMemo(() => {
        const txs = Object.values(allTransactions)
        return txs.filter(isTransactionRecent).sort(newTransactionsFirst)
    }, [allTransactions])

    return useMemo(() => {
        const pending = sortedRecentTransactions.filter((tx) => !tx.receipt)
        // .map((tx) => tx.hash)
        return !!pending.length
    }, [sortedRecentTransactions])
}

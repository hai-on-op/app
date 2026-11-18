import { useCallback, useMemo, useState } from 'react'
import { TransactionResponse } from '@ethersproject/providers'
import { MaxUint256 } from '@ethersproject/constants'
import { BigNumber } from 'ethers'
import { erc20ABI, useAccount, useNetwork, usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'

import { ActionState, NETWORK_ID, parseTokenAmount } from '~/utils'
import { useStoreActions } from '~/store'

import { calculateGasMargin, handleTransactionError } from './TransactionHooks'
import { useTokenContract } from './useContract'
import { useGeb } from './useGeb'

export enum ApprovalState {
    UNKNOWN,
    NOT_APPROVED,
    PENDING,
    APPROVED,
}
// checks for token allowance
export function useTokenAllowance(tokenAddress?: string, owner?: string, spender?: string) {
    const { chain } = useNetwork()
    const chainId = chain?.id ?? NETWORK_ID
    const client = usePublicClient({ chainId })
    const enabled = !!tokenAddress && !!owner && !!spender
    const { data, refetch, isFetching, isError } = useQuery({
        queryKey: [
            'tokenAllowance',
            chainId,
            tokenAddress?.toLowerCase(),
            owner?.toLowerCase(),
            spender?.toLowerCase(),
        ],
        enabled,
        staleTime: 0,
        queryFn: async () =>
            BigNumber.from(
                await client.readContract({
                    abi: erc20ABI,
                    functionName: 'allowance',
                    address: tokenAddress as Address,
                    args: [owner as Address, spender as Address],
                })
            ),
    })
    const updateAllowance = useCallback(async () => {
        if (enabled) await refetch()
    }, [enabled, refetch])

    return { allowance: enabled && !isError ? data : undefined, updateAllowance, loading: isFetching }
}

export function useTokenApproval(
    amount: string,
    tokenAddress?: string,
    spender?: string,
    decimals: string = '18',
    exactApproval: boolean = false
): [ApprovalState, () => Promise<void>] {
    const { popupsModel: popupsActions, transactionsModel: transactionsActions } = useStoreActions((actions) => actions)

    const { address: account } = useAccount()
    const geb = useGeb()
    const {
        allowance: currentAllowance,
        updateAllowance,
        loading: pendingAllowance,
    } = useTokenAllowance(tokenAddress, account ?? undefined, spender)
    const [loading, setLoading] = useState(false)

    const approvalAmount = useMemo(() => {
        const amountInBaseUnits = parseTokenAmount(amount, Number(decimals))
        // Keep the existing approval buffer for debt accrued before the transaction is mined.
        if (!amountInBaseUnits) return undefined
        const buffered = amountInBaseUnits.mul(101).div(100)
        return buffered.gt(MaxUint256) ? MaxUint256 : buffered
    }, [amount, decimals])

    const approvalState: ApprovalState = useMemo(() => {
        if (!amount || !tokenAddress || !spender || !geb || !approvalAmount) return ApprovalState.UNKNOWN
        if (approvalAmount.isZero()) return ApprovalState.APPROVED
        if (!currentAllowance) return ApprovalState.UNKNOWN
        if (currentAllowance.gte(approvalAmount)) return ApprovalState.APPROVED
        return pendingAllowance || loading ? ApprovalState.PENDING : ApprovalState.NOT_APPROVED
    }, [amount, tokenAddress, spender, geb, approvalAmount, currentAllowance, pendingAllowance, loading])

    const tokenContract = useTokenContract(tokenAddress)

    const approve = useCallback(async (): Promise<void> => {
        if (approvalState !== ApprovalState.NOT_APPROVED) {
            console.error('approve was called unnecessarily')
            return
        }
        if (!tokenAddress) {
            console.error('no token')
            return
        }

        if (!tokenContract) {
            console.error('tokenContract is null')
            return
        }

        if (!approvalAmount) {
            console.error('missing amount to approve')
            return
        }

        if (!spender) {
            console.error('no spender')
            return
        }

        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            title: 'Waiting for confirmation',
            text: 'Confirm this transaction in your wallet',
            status: ActionState.LOADING,
        })

        setLoading(true)
        try {
            let amountToApprove = exactApproval ? approvalAmount : MaxUint256
            const estimatedGas = await tokenContract.estimateGas.approve(spender, amountToApprove).catch((error) => {
                if (exactApproval) throw error
                // Some tokens restrict unlimited approvals.
                amountToApprove = approvalAmount
                return tokenContract.estimateGas.approve(spender, amountToApprove)
            })
            const txResponse: TransactionResponse = await tokenContract.approve(spender, amountToApprove, {
                gasLimit: calculateGasMargin(estimatedGas),
            })
            const { hash, chainId } = txResponse
            transactionsActions.addTransaction({
                chainId,
                hash,
                from: txResponse.from,
                summary: 'Token Approval',
                addedTime: new Date().getTime(),
                originalTx: txResponse,
                approval: {
                    tokenAddress,
                    spender,
                },
            })
            popupsActions.setWaitingPayload({
                title: 'Waiting for confirmation',
                text: 'Transaction successfull, confirming updated allowance...',
                status: ActionState.LOADING,
            })
            // we need to wait until the transaction is mined to fetch the new allowance
            await txResponse.wait()
            popupsActions.setIsWaitingModalOpen(false)
            popupsActions.setWaitingPayload({ status: ActionState.NONE })
            updateAllowance()
        } catch (error: any) {
            console.debug('Failed to approve token', error)
            handleTransactionError(error)
        } finally {
            setLoading(false)
        }
    }, [
        approvalState,
        tokenAddress,
        tokenContract,
        spender,
        exactApproval,
        approvalAmount,
        updateAllowance,
        popupsActions,
        transactionsActions,
    ])

    return [approvalState, approve]
}

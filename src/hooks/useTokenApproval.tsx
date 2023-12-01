import { useCallback, useEffect, useMemo, useState } from 'react'
import { TransactionResponse } from '@ethersproject/providers'
import { MaxUint256 } from '@ethersproject/constants'
import { BigNumber, ethers } from 'ethers'
import { useAccount } from 'wagmi'

import { calculateGasMargin, handleTransactionError } from './TransactionHooks'
import { useTokenContract } from './useContract'
import { useGeb } from './useGeb'
import store from '~/store'
import { sanitizeDecimals } from '~/utils'

const decimals18 = BigNumber.from(10).pow(18)

export enum ApprovalState {
    UNKNOWN,
    NOT_APPROVED,
    PENDING,
    APPROVED,
}
// checks for token allowance
export function useTokenAllowance(tokenAddress?: string, owner?: string, spender?: string) {
    const [allowance, setAllowance] = useState<BigNumber | undefined>()
    const [loading, setLoading] = useState<boolean>(false)
    const contract = useTokenContract(tokenAddress, false)

    const updateAllowance = useCallback(async () => {
        if (owner && spender) {
            setLoading(true)
            setAllowance(await contract?.allowance(owner, spender))
            setLoading(false)
        }
    }, [contract, owner, spender])

    useEffect(() => {
        updateAllowance()
    }, [updateAllowance])

    return { allowance, updateAllowance, loading }
}

export function useTokenApproval(
    amount: string, // in 18 decimals
    tokenAddress?: string,
    spender?: string,
    decimals: string = '18',
    exactApproval: boolean = false,
    isRepayAll?: boolean
): [ApprovalState, () => Promise<void>] {
    const { address: account } = useAccount()
    const geb = useGeb()
    const {
        allowance: currentAllowance,
        updateAllowance,
        loading: pendingAllowance,
    } = useTokenAllowance(tokenAddress, account ?? undefined, spender)
    const tokenDecimals = BigNumber.from(10).pow(decimals)
    const [loading, setLoading] = useState(false)

    // Formatted approval amount (with 18 decimals)
    const approvalAmount = useMemo(() => {
        if (!amount) return BigNumber.from(0)

        // cut decimals to avoid underflow error
        const formattedAmount = sanitizeDecimals(amount, 18)
        // Format the amount to 18 decimals
        const approvalAmount = ethers.utils.parseEther(formattedAmount).mul(tokenDecimals).div(decimals18)

        // Add 1% to the approval amount in case that the debt increses
        if (isRepayAll) {
            return approvalAmount.mul(101).div(100)
        } else {
            return approvalAmount
        }
    }, [amount, tokenDecimals])

    // check the current approval status
    const approvalState: ApprovalState = useMemo(() => {
        if (!amount || !tokenAddress || !spender || !geb) {
            return ApprovalState.UNKNOWN
        }

        // we might not have enough data to know whether or not we need to approve
        if (!currentAllowance) return ApprovalState.UNKNOWN

        // amountToApprove will be defined if currentAllowance is
        return currentAllowance.lt(approvalAmount)
            ? pendingAllowance || loading
                ? ApprovalState.PENDING
                : ApprovalState.NOT_APPROVED
            : ApprovalState.APPROVED
    }, [amount, tokenAddress, spender, geb, currentAllowance, approvalAmount, pendingAllowance, loading])

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

        if (!amount) {
            console.error('missing amount to approve')
            return
        }

        if (!spender) {
            console.error('no spender')
            return
        }

        store.dispatch.popupsModel.setIsWaitingModalOpen(true)
        store.dispatch.popupsModel.setBlockBackdrop(true)
        store.dispatch.popupsModel.setWaitingPayload({
            title: 'Waiting for confirmation',
            text: 'Confirm this transaction in your wallet',
            status: 'loading',
        })

        let useExact = exactApproval
        const estimatedGas = await tokenContract.estimateGas.approve(spender, MaxUint256).catch(() => {
            // general fallback for tokens who restrict approval amounts
            useExact = true
            return tokenContract.estimateGas.approve(spender, approvalAmount.toString())
        })
        setLoading(true)
        return tokenContract
            .approve(spender, useExact ? approvalAmount.toString() : MaxUint256, {
                gasLimit: calculateGasMargin(estimatedGas),
            })
            .then((txResponse: TransactionResponse) => {
                const { hash, chainId } = txResponse
                store.dispatch.transactionsModel.addTransaction({
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
                store.dispatch.popupsModel.setWaitingPayload({
                    title: 'Transaction Submitted',
                    hash: txResponse.hash,
                    status: 'success',
                })
                // we need to wait until the transaction is mined to fetch the new allowance
                txResponse.wait().then(() => {
                    updateAllowance()
                    setLoading(false)
                })
            })
            .catch((error: Error) => {
                console.debug('Failed to approve token', error)
                handleTransactionError(error)
                setLoading(false)
            })
    }, [approvalState, tokenAddress, tokenContract, amount, spender, exactApproval, approvalAmount, updateAllowance])

    return [approvalState, approve]
}

import { useMemo, useRef } from 'react'
import { ActionState, formatTimeFromSeconds, secondsToDays } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { handleTransactionError, useEthersSigner } from '~/hooks'
import { useStakingData } from '~/hooks/useStakingData'

import styled from 'styled-components'
import { HaiButton, Text } from '~/styles'
import { TransactionSummary } from '~/components/TransactionSummary'
import { ModalBody, ModalFooter } from '../index'
import { stakingModel } from '~/model/stakingModel'

type ConfirmProps = {
    onClose?: () => void
    isStaking: boolean
    amount: string
    stakedAmount: string
    isWithdraw?: boolean
    onSuccess?: () => void
}

export function Confirm({ onClose, isStaking, amount, stakedAmount, isWithdraw, onSuccess }: ConfirmProps) {
    const signer = useEthersSigner()
    const { popupsModel: popupsActions, stakingModel: stakingActions } = useStoreActions((actions) => actions)
    const { stakingModel: stakingStates } = useStoreState((state) => state)
    const { refetchAll } = useStakingData()
    
    // Use ref to prevent reopening modal after completion
    const hasCompletedRef = useRef(false)

    console.log('Coool down params:::', stakingStates.cooldownPeriod)

    const handleConfirm = async () => {
        if (!signer) return

        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            title: 'Waiting For Confirmation',
            text: isStaking ? 'Stake KITE' : isWithdraw ? 'Withdraw KITE' : 'Unstake KITE',
            hint: 'Confirm this transaction in your wallet',
            status: ActionState.LOADING,
        })

        try {
            stakingActions.setTransactionState(ActionState.LOADING)

            if (isStaking) {
                await stakingActions.stake({
                    signer,
                    amount,
                })
            } else if (isWithdraw) {
                await stakingActions.withdraw({
                    signer,
                })
            } else {
                await stakingActions.unstake({
                    signer,
                    amount,
                })
            }

            stakingActions.setTransactionState(ActionState.SUCCESS)
            popupsActions.setIsWaitingModalOpen(false)
            popupsActions.setWaitingPayload({ status: ActionState.NONE })
            
            // Mark as completed to prevent reopening
            hasCompletedRef.current = true

            // First close the modal to prevent any race conditions
            onClose?.()
            
            // Wait to ensure modal is fully closed before updating state
            setTimeout(() => {
                // Run the success callback to reset input values if provided
                onSuccess?.()
                
                // Refetch all data after successful transaction
                refetchAll()
            }, 500)
        } catch (e: any) {
            stakingActions.setTransactionState(ActionState.ERROR)
            handleTransactionError(e)
        }
    }

    return (
        <>
            <ModalBody>
                <Description>
                    Stake KITE for a boosted HAI and revenue share. stKITE can be claimed 21 days after unstaking.
                    Additional unstaking requests are combined with the previous request and the cooldown period is
                    reset.
                </Description>
                <TransactionSummary
                    items={[
                        {
                            label: 'Amount',
                            value: {
                                current: Number(stakedAmount).toString(),
                                after: isStaking
                                    ? (Number(stakedAmount) + Number(amount)).toString()
                                    : (Number(stakedAmount) - Number(amount)).toString(),
                                label: 'KITE',
                            },
                        },
                    ]}
                />
                {!isStaking && (
                    <Text $fontSize="0.8em" $color="rgba(0,0,0,0.4)">
                        Note: Unstaked KITE has a {formatTimeFromSeconds(Number(stakingStates.cooldownPeriod))}-day
                        cooldown period before it can be claimed
                    </Text>
                )}
            </ModalBody>
            <ModalFooter $justify="flex-end">
                <HaiButton $variant="yellowish" onClick={handleConfirm}>
                    Confirm Transaction
                </HaiButton>
            </ModalFooter>
        </>
    )
}

const Description = styled(Text)`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        font-size: ${theme.font.small};
    `}
`

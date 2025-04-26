import { useMemo, useRef } from 'react'
import { ActionState, formatTimeFromSeconds, secondsToDays } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { handleTransactionError, useEthersSigner } from '~/hooks'
import { useStaking } from '~/providers/StakingProvider'
import { useStakingSummary } from '~/hooks/useStakingSummary'

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
    const { refetchAll } = useStaking()
    // Use the effective staked amount from useStakingSummary
    const { myStaked } = useStakingSummary()

    // Use ref to prevent reopening modal after completion
    const hasCompletedRef = useRef(false)

    const handleConfirm = async () => {
        if (!signer) return

        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            title: 'Waiting For Confirmation',
            text: isStaking ? 'Stake KITE' : isWithdraw ? 'Withdraw KITE' : 'Unstake KITE',
            hint: 'Confirm this transaction in your wallet',
            status: ActionState.LOADING,
        })

        console.log('Confirming', isStaking, isWithdraw, amount)

        try {
            stakingActions.setTransactionState(ActionState.LOADING)

            console.log('setTransactionState')

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

            // Simplified refetch since optimistic updates are handled in the model
            await refetchAll({})
            
            // Call onSuccess if provided
            onSuccess?.()
        } catch (e: any) {
            stakingActions.setTransactionState(ActionState.ERROR)
            handleTransactionError(e)
        }
    }

    // Use effective amount from useStakingSummary
    const effectiveStakedAmount = myStaked.effectiveAmount.toString()

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
                                current: isWithdraw
                                    ? (Number(effectiveStakedAmount) + Number(amount)).toString()
                                    : effectiveStakedAmount.toString(),
                                after: isStaking
                                    ? (Number(effectiveStakedAmount) + Number(amount)).toString()
                                    : isWithdraw
                                    ? effectiveStakedAmount
                                    : (Number(effectiveStakedAmount) - Number(amount)).toString(),
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

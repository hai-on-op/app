import { useMemo, useRef } from 'react'
import { ActionState, formatNumberWithStyle, formatTimeFromSeconds, secondsToDays } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { handleTransactionError, useEthersSigner } from '~/hooks'
import { useStaking } from '~/providers/StakingProvider'
import { useStakingSummary } from '~/hooks/useStakingSummary'

import styled from 'styled-components'
import { HaiButton, Text } from '~/styles'
import { TransactionSummary } from '~/components/TransactionSummary'
import { ModalBody, ModalFooter } from '../index'
import { stakingModel } from '~/model/stakingModel'
import { useBoost } from '~/hooks/useBoost'

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

    const { simulateNetBoost, netBoostValue } = useBoost()

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
    const effectiveStakedAmount = stakingStates.stakedBalance

    const totalStaked = Number(stakingStates.totalStaked) > 0 ? Number(stakingStates.totalStaked) / 10 ** 18 : 0

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
                                current: `${formatNumberWithStyle(
                                    isWithdraw
                                        ? (Number(effectiveStakedAmount) + Number(amount)).toString()
                                        : effectiveStakedAmount.toString(),
                                    {
                                        maxDecimals: 2,
                                        minDecimals: 0,
                                    }
                                )} `,
                                after: `${formatNumberWithStyle(
                                    isStaking
                                        ? (Number(effectiveStakedAmount) + Number(amount)).toString()
                                        : isWithdraw
                                        ? effectiveStakedAmount
                                        : (Number(effectiveStakedAmount) - Number(amount)).toString(),
                                    {
                                        maxDecimals: 2,
                                        minDecimals: 0,
                                    }
                                )}`,
                                label: 'stKITE',
                            },
                        },
                        {
                            label: 'Net Boost',
                            value: {
                                current: `${
                                    !isWithdraw
                                        ? `${formatNumberWithStyle(
                                              simulateNetBoost(Number(effectiveStakedAmount), Number(totalStaked)),
                                              {
                                                  maxDecimals: 2,
                                                  minDecimals: 0,
                                              }
                                          )}x`
                                        : ''
                                }`,
                                after: `${
                                    !isWithdraw
                                        ? `${formatNumberWithStyle(
                                              simulateNetBoost(
                                                  Number(effectiveStakedAmount) + (isStaking ? 1 : -1) * Number(amount),
                                                  Number(totalStaked + (isStaking ? 1 : -1) * Number(amount))
                                              ),
                                              {
                                                  maxDecimals: 2,
                                                  minDecimals: 0,
                                              }
                                          )}x`
                                        : ''
                                }`,
                                label: '',
                            },
                        },
                    ]}
                />
                {!isStaking && (
                    <Text $fontSize="0.8em" $color="rgba(0,0,0,0.4)">
                        Note: Unstaked KITE has a {formatTimeFromSeconds(Number(stakingStates.cooldownPeriod))} cooldown
                        period before it can be claimed
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

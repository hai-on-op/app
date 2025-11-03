import { useRef } from 'react'
import { ActionState, formatNumberWithStyle, formatTimeFromSeconds } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { handleTransactionError, useEthersSigner } from '~/hooks'
import { useStaking } from '~/providers/StakingProvider'
// import { useStakingSummary } from '~/hooks/useStakingSummary'

import styled from 'styled-components'
import { HaiButton, Text } from '~/styles'
import { TransactionSummary } from '~/components/TransactionSummary'
import { ModalBody, ModalFooter } from '../index'
// import { stakingModel } from '~/model/stakingModel'
import { useBoost } from '~/hooks/useBoost'
import { useStakeMutations } from '~/hooks/staking/useStakeMutations'
import { useAccount } from 'wagmi'
import type { StakingConfig } from '~/types/stakingConfig'

type ConfirmProps = {
    onClose?: () => void
    isStaking: boolean
    amount: string
    stakedAmount: string
    isWithdraw?: boolean
    onSuccess?: () => void
    config?: StakingConfig
}

export function Confirm({ onClose, isStaking, amount, isWithdraw, onSuccess, config }: ConfirmProps) {
    const signer = useEthersSigner()
    const { popupsModel: popupsActions, stakingModel: stakingActions } = useStoreActions((actions) => actions)
    const { stakingModel: stakingStates } = useStoreState((state) => state)
    const stakingCtx = useStaking() as any
    const refetchAll = stakingCtx?.refetchAll || (() => Promise.resolve())
    const { address } = useAccount()
    const { stake, initiateWithdrawal, withdraw, cancelWithdrawal, claimRewards } = useStakeMutations(address as any)
    // Use the effective staked amount from useStakingSummary
    // const { myStaked } = useStakingSummary()

    const { simulateNetBoost } = useBoost()

    // Use ref to prevent reopening modal after completion
    const hasCompletedRef = useRef(false)

    const tokenLabel = config?.labels.token || 'KITE'
    const stTokenLabel = config?.labels.stToken || 'stKITE'
    const stakeVerb = config?.labels.stakeVerb || 'Stake'

    const handleConfirm = async () => {
        if (!signer) return

        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            title: 'Waiting For Confirmation',
            text: isStaking
                ? `${stakeVerb} ${tokenLabel}`
                : isWithdraw
                ? `Withdraw ${tokenLabel}`
                : `Unstake ${tokenLabel}`,
            hint: 'Confirm this transaction in your wallet',
            status: ActionState.LOADING,
        })

        try {
            stakingActions.setTransactionState(ActionState.LOADING)

            console.log('setTransactionState')

            if (isStaking) await stake.mutateAsync(amount)
            else if (isWithdraw) await withdraw.mutateAsync()
            else await initiateWithdrawal.mutateAsync(amount)

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
                    {stakeVerb} {tokenLabel}. {stTokenLabel} can be claimed after the cooldown period. Additional
                    unstaking requests are combined with the previous request and the cooldown period is reset.
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
                                label: stTokenLabel,
                            },
                        },
                        ...(config?.affectsBoost === false
                            ? []
                            : ([
                                  {
                                      label: 'Net Boost',
                                      value: {
                                          current: `${
                                              !isWithdraw
                                                  ? `${formatNumberWithStyle(
                                                        simulateNetBoost(
                                                            Number(effectiveStakedAmount),
                                                            Number(totalStaked)
                                                        ),
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
                                                            Number(effectiveStakedAmount) +
                                                                (isStaking ? 1 : -1) * Number(amount),
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
                              ] as const)),
                    ]}
                />
                {!isStaking && (
                    <Text $fontSize="0.8em" $color="rgba(0,0,0,0.4)">
                        Note: Unstaked {tokenLabel} has a {formatTimeFromSeconds(Number(stakingStates.cooldownPeriod))} cooldown
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

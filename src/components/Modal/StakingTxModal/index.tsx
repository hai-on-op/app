import { useMemo, useState, useRef, useCallback } from 'react'

import { Approvals } from './Approvals'
import { Confirm } from './Confirm'
import { InstantWithdrawExecute } from './InstantWithdrawExecute'
import { Modal, type ModalProps } from '../index'
import { BrandedTitle } from '~/components/BrandedTitle'
import type { StakingConfig } from '~/types/stakingConfig'
import { X } from '~/components/Icons/X'

enum StakingTxStep {
    APPROVE,
    CONFIRM,
    INSTANT_WITHDRAW,
}

type StakingTxModalProps = ModalProps & {
    isStaking: boolean
    amount: string
    stakedAmount: string
    totalStaked: string
    cooldownPeriod: number
    isWithdraw?: boolean
    onSuccess?: () => void
    config?: StakingConfig
}

export function StakingTxModal({
    isStaking,
    amount,
    stakedAmount,
    totalStaked,
    cooldownPeriod,
    isWithdraw = false,
    onSuccess,
    config,
    ...props
}: StakingTxModalProps) {
    // Determine if this is a zero-cooldown unstake scenario (two-step instant withdraw)
    const isInstantWithdraw = !isStaking && !isWithdraw && cooldownPeriod === 0

    const [step, setStep] = useState(() => {
        // Always start at APPROVE step - even for instant withdraw, we need stToken approval
        return StakingTxStep.APPROVE
    })
    // Track if transaction is completed to prevent reopening
    const hasClosedRef = useRef(false)

    // Destructure onClose from props to avoid dependency issues
    const { onClose } = props

    // Ensure we only close once
    const handleClose = useCallback(() => {
        if (hasClosedRef.current) return
        hasClosedRef.current = true

        if (onClose) {
            onClose()
        }
    }, [onClose])

    const content = useMemo(() => {
        // Zero-cooldown unstaking: show two-step instant withdraw flow
        if (step === StakingTxStep.INSTANT_WITHDRAW) {
            return (
                <InstantWithdrawExecute
                    amount={amount}
                    stakedAmount={stakedAmount}
                    onClose={handleClose}
                    onSuccess={onSuccess}
                    config={config}
                />
            )
        }

        switch (step) {
            case StakingTxStep.APPROVE:
                return (
                    <Approvals
                        onNext={() =>
                            setStep(isInstantWithdraw ? StakingTxStep.INSTANT_WITHDRAW : StakingTxStep.CONFIRM)
                        }
                        isStaking={isStaking}
                        isWithdraw={isWithdraw}
                        amount={amount}
                        config={config}
                    />
                )
            case StakingTxStep.CONFIRM:
                return (
                    <Confirm
                        onClose={handleClose}
                        isStaking={isStaking}
                        amount={amount}
                        stakedAmount={stakedAmount}
                        totalStaked={totalStaked}
                        cooldownPeriod={cooldownPeriod}
                        isWithdraw={isWithdraw}
                        onSuccess={onSuccess}
                        config={config}
                    />
                )
        }
    }, [
        step,
        handleClose,
        isStaking,
        isInstantWithdraw,
        amount,
        stakedAmount,
        totalStaked,
        cooldownPeriod,
        isWithdraw,
        onSuccess,
        config,
    ])

    return (
        <Modal
            onClose={handleClose}
            {...props}
            maxWidth={step === StakingTxStep.APPROVE ? '500px' : '500px'}
            overrideContent={
                <>
                    <Modal.Header>
                        <BrandedTitle textContent="MANAGE STAKING" $fontSize="2.5em" />
                        {props.onClose && (
                            <Modal.Close onClick={handleClose}>
                                <X size={14} />
                            </Modal.Close>
                        )}
                    </Modal.Header>
                    {content}
                </>
            }
        />
    )
}

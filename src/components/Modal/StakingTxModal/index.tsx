import { useMemo, useState, useRef } from 'react'

import { Approvals } from './Approvals'
import { Confirm } from './Confirm'
import { Modal, type ModalProps } from '../index'
import { BrandedTitle } from '~/components/BrandedTitle'
import type { StakingConfig } from '~/types/stakingConfig'
import { X } from '~/components/Icons/X'

enum StakingTxStep {
    APPROVE,
    CONFIRM,
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
    const [step, setStep] = useState(StakingTxStep.APPROVE)
    // Track if transaction is completed to prevent reopening
    const hasClosedRef = useRef(false)

    // Ensure we only close once
    const handleClose = () => {
        if (hasClosedRef.current) return
        hasClosedRef.current = true

        if (props.onClose) {
            props.onClose()
        }
    }

    const content = useMemo(() => {
        if (isWithdraw)
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
        switch (step) {
            case StakingTxStep.APPROVE:
                return (
                    <Approvals onNext={() => setStep(StakingTxStep.CONFIRM)} isStaking={isStaking} amount={amount} config={config} />
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
    }, [step, handleClose, isStaking, amount, stakedAmount, totalStaked, cooldownPeriod, isWithdraw, onSuccess, config])

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

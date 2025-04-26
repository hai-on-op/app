import { useMemo, useState, useRef } from 'react'

import { Approvals } from './Approvals'
import { Confirm } from './Confirm'
import { Modal, type ModalProps } from '../index'
import { BrandedTitle } from '~/components/BrandedTitle'
import { X } from '~/components/Icons/X'

enum StakingTxStep {
    APPROVE,
    CONFIRM,
}

type StakingTxModalProps = ModalProps & {
    isStaking: boolean
    amount: string
    stakedAmount: string
    isWithdraw?: boolean
    onSuccess?: () => void
}

export function StakingTxModal({
    isStaking,
    amount,
    stakedAmount,
    isWithdraw = false,
    onSuccess,
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
        switch (step) {
            case StakingTxStep.APPROVE:
                return <Approvals onNext={() => setStep(StakingTxStep.CONFIRM)} isStaking={isStaking} amount={amount} />
            case StakingTxStep.CONFIRM:
                return (
                    <Confirm
                        onClose={handleClose}
                        isStaking={isStaking}
                        amount={amount}
                        stakedAmount={stakedAmount}
                        isWithdraw={isWithdraw}
                        onSuccess={onSuccess}
                    />
                )
        }
    }, [step, handleClose, isStaking, amount, stakedAmount, isWithdraw, onSuccess])

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

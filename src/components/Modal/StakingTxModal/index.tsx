import { useMemo, useState } from 'react'

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
}

export function StakingTxModal({ isStaking, amount, stakedAmount, isWithdraw = false, ...props }: StakingTxModalProps) {
    const [step, setStep] = useState(StakingTxStep.APPROVE)

    const content = useMemo(() => {
        switch (step) {
            case StakingTxStep.APPROVE:
                return <Approvals onNext={() => setStep(StakingTxStep.CONFIRM)} isStaking={isStaking} amount={amount} />
            case StakingTxStep.CONFIRM:
                return <Confirm onClose={props.onClose} isStaking={isStaking} amount={amount} stakedAmount={stakedAmount} isWithdraw={isWithdraw} />
        }
    }, [step, props.onClose, isStaking, amount, stakedAmount])

    return (
        <Modal
            onClose={props.onClose}
            {...props}
            maxWidth={step === StakingTxStep.APPROVE ? '480px' : props.maxWidth}
            overrideContent={
                <>
                    <Modal.Header>
                        <BrandedTitle textContent="MANAGE STAKING" $fontSize="2.5em" />
                        {props.onClose && (
                            <Modal.Close onClick={props.onClose}>
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
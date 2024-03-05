import { useMemo, useState } from 'react'

import { Approvals } from './Approvals'
import { Confirm } from './Confirm'
import { Modal, type ModalProps } from '../index'
import { BrandedTitle } from '~/components/BrandedTitle'
import { X } from '~/components/Icons/X'

enum VaultTxStep {
    APPROVE,
    CONFIRM,
}

export function VaultTxModal(props: ModalProps) {
    const [step, setStep] = useState(VaultTxStep.APPROVE)

    const content = useMemo(() => {
        switch (step) {
            case VaultTxStep.APPROVE:
                return <Approvals onNext={() => setStep(VaultTxStep.CONFIRM)} />
            case VaultTxStep.CONFIRM:
                return <Confirm onClose={props.onClose} />
        }
    }, [step, props.onClose])

    return (
        <Modal
            onClose={props.onClose}
            {...props}
            maxWidth={step === VaultTxStep.APPROVE ? '480px' : props.maxWidth}
            overrideContent={
                <>
                    <Modal.Header>
                        <BrandedTitle textContent="MANAGE VAULT" $fontSize="2.5em" />
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

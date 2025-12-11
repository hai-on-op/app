import { useMemo, useRef, useState } from 'react'

import { Approvals, type HaiVeloApprovalItem } from './Approvals'
import { Execute } from './Execute'
import { Modal, type ModalProps } from '../index'
import { BrandedTitle } from '~/components/BrandedTitle'
import { X } from '~/components/Icons/X'

type HaiVeloTxModalProps = ModalProps & {
    items: HaiVeloApprovalItem[]
    plan: {
        depositVeloWei?: string
        depositVeNftTokenIds?: string[]
        depositVeNftTotalWei?: string
        migrateV1Wei?: string
    }
    onAllApproved: () => void
    onStepDone: (step: 'depositVelo' | 'depositVeNfts' | 'migrateV1') => void
}

export function HaiVeloTxModal({ items, plan, onAllApproved, onStepDone, ...props }: HaiVeloTxModalProps) {
    const hasClosedRef = useRef(false)
    const [phase, setPhase] = useState<'approvals' | 'execute'>(items.length > 0 ? 'approvals' : 'execute')

    const handleClose = () => {
        if (hasClosedRef.current) return
        hasClosedRef.current = true
        props.onClose?.()
    }

    const content = useMemo(() => {
        if (phase === 'approvals') {
            return (
                <Approvals
                    items={items}
                    onAllApproved={() => {
                        setPhase('execute')
                    }}
                />
            )
        }
        return <Execute plan={plan} onDone={onAllApproved} onStepDone={onStepDone} />
    }, [phase, items, plan, onAllApproved, onStepDone])

    return (
        <Modal
            onClose={handleClose}
            {...props}
            maxWidth={'720px'}
            ignoreWaiting={true}
            overrideContent={
                <>
                    <Modal.Header>
                        <BrandedTitle textContent="MINT haiVELO v2" $fontSize="2.5em" />
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


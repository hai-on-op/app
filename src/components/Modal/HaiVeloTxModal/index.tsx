import { useMemo, useRef } from 'react'

import { Approvals, type HaiVeloApprovalItem } from './Approvals'
import { Modal, type ModalProps } from '../index'
import { BrandedTitle } from '~/components/BrandedTitle'
import { X } from '~/components/Icons/X'

type HaiVeloTxModalProps = ModalProps & {
    items: HaiVeloApprovalItem[]
    onAllApproved: () => void
}

export function HaiVeloTxModal({ items, onAllApproved, ...props }: HaiVeloTxModalProps) {
    const hasClosedRef = useRef(false)

    const handleClose = () => {
        if (hasClosedRef.current) return
        hasClosedRef.current = true
        props.onClose?.()
    }

    const content = useMemo(() => {
        return (
            <Approvals
                items={items}
                onAllApproved={() => {
                    // Approvals done → hand off to parent (will close modal or continue flow)
                    onAllApproved()
                }}
            />
        )
    }, [items, onAllApproved])

    return (
        <Modal
            onClose={handleClose}
            {...props}
            maxWidth={'500px'}
            overrideContent={
                <>
                    <Modal.Header>
                        <BrandedTitle textContent="MINT HAI-VELO" $fontSize="2.5em" />
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


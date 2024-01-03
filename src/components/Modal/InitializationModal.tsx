import { Modal, type ModalProps } from './index'
import { WaitingModalContent } from './WaitingModalContent'

export function InitializationModal({ onClose, ...props }: ModalProps) {
    return (
        <Modal
            {...props}
            maxWidth="350px"
            overrideContent={(
                <WaitingModalContent
                    onClose={onClose}
                    hideButton
                />
            )}
            ignoreWaiting
        />
    )
}

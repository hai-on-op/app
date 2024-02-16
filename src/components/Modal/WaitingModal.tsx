import { useStoreActions, useStoreState } from '~/store'

import { Modal, type ModalProps } from './index'
import { WaitingModalContent } from './WaitingModalContent'

export function WaitingModal(props: ModalProps) {
    const { auctionOperationPayload, isClaimPopupOpen, isInitializing, isWaitingModalOpen, openModals } = useStoreState(
        ({ popupsModel }) => popupsModel
    )
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    if (!isInitializing && !isWaitingModalOpen) return null
    if (isClaimPopupOpen || auctionOperationPayload.isOpen) return null
    if (openModals.length) return null

    const onClose = props.onClose || (isInitializing ? undefined : () => popupsActions.setIsWaitingModalOpen(false))

    return (
        <Modal
            {...props}
            maxWidth="350px"
            overrideContent={<WaitingModalContent onClose={onClose} hideButton={!onClose} />}
            ignoreWaiting
        />
    )
}

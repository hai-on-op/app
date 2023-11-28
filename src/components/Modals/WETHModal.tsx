import { useStoreActions, useStoreState } from '~/store'

import Modal from './Modal'
import AuctionsOperations from '~/containers/Safes/wrapEth'

const WethModal = () => {
    const { popupsModel: popupsState } = useStoreState(state => state)
    const {
        popupsModel: popupsActions,
        safeModel: safeActions
    } = useStoreActions(actions => actions)

    const handleCancel = () => {
        popupsActions.setSafeOperationPayload({
            isOpen: false,
            type: '',
            isCreate: false,
        })
        safeActions.setOperation(0)
        popupsActions.setReturnProxyFunction(() => {})
    }

    return (
        <Modal
            isModalOpen={popupsState.safeOperationPayload.isOpen}
            handleModalContent
            backDropClose={!popupsState.blockBackdrop}
            closeModal={handleCancel}>
            <AuctionsOperations/>
        </Modal>
    )
}

export default WethModal

import { useStoreActions, useStoreState } from '~/store'

import Modal from './Modal'
import AuctionsOperations from '~/components/AuctionsOperations'

const AuctionsModal = () => {
    const { popupsModel: popupsState } = useStoreState(state => state)
    const {
        popupsModel: popupsActions,
        auctionModel: auctionsActions
    } = useStoreActions(actions => actions)

    const handleCancel = () => {
        popupsActions.setAuctionOperationPayload({
            isOpen: false,
            type: '',
            auctionType: '',
        })
        auctionsActions.setOperation(0)
        popupsActions.setReturnProxyFunction(() => {})
        auctionsActions.setAmount('')
        auctionsActions.setSelectedAuction(null)
    }

    return (
        <Modal
            isModalOpen={popupsState.auctionOperationPayload.isOpen}
            handleModalContent
            backDropClose={!popupsState.blockBackdrop}
            closeModal={handleCancel}>
            <AuctionsOperations />
        </Modal>
    )
}

export default AuctionsModal

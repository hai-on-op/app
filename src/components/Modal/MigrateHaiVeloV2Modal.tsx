import { Modal, type ModalProps } from '~/components/Modal'
import { AeroMigrationNotice } from '~/components/AeroMigrationNotice'

export function MigrateHaiVeloV2Modal(props: ModalProps) {
    return (
        <Modal {...props} heading="AERO migration" maxWidth="820px">
            <AeroMigrationNotice />
        </Modal>
    )
}

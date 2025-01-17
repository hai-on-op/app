import { Modal, type ModalProps } from '~/components/Modal'
import { ProxyPrompt } from '~/components/ProxyPrompt'
import { HaiButton } from '~/styles'

export function CreateAccountModal(props: ModalProps) {
    const heading = 'CREATE ACCOUNT'
    return (
        <Modal {...props} heading={heading}>
            <ProxyPrompt onSuccess={props.onClose}>
                <HaiButton $variant="yellowish" onClick={props.onClose}>
                    Continue
                </HaiButton>
            </ProxyPrompt>
        </Modal>
    )
}

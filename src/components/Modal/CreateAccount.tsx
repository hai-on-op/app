import { Modal, type ModalProps } from '~/components/Modal'
import styled from 'styled-components'
import { ProxyPrompt } from '~/components/ProxyPrompt'
import { Flex, HaiButton } from '~/styles'

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

const Footer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    ...props,
}))``

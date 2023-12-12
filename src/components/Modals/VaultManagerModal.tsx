import { useTranslation } from 'react-i18next'

import { useStoreActions, useStoreState } from '~/store'

import styled from 'styled-components'
import Modal from './Modal'
import VaultManager from '~/components/VaultManager'

const VaultManagerModal = () => {
    const { t } = useTranslation()
    const { popupsModel: popupsState } = useStoreState(state => state)
    const { popupsModel: popupsActions } = useStoreActions(actions => actions)

    return (
        <Modal
            title="settings"
            isModalOpen={popupsState.isVaultManagerOpen}
            closeModal={() => popupsActions.setIsVaultManagerOpen(false)}
            backDropClose
            handleModalContent>
            <ModalContent>
                <Header>{t('manage_other_safes')}</Header>
                <VaultManager/>
            </ModalContent>
        </Modal>
    )
}

export default VaultManagerModal

const ModalContent = styled.div`
    max-width: 720px;
    width: 100%;
    background: ${({ theme }) => theme.colors.background};
    border-radius: ${({ theme }) => theme.global.borderRadius};
    border: ${({ theme }) => theme.border.thin};
`

const Header = styled.div`
    padding: 20px;
    font-size: ${({ theme }) => theme.font.large};
    font-weight: 600;
    color: ${({ theme }) => theme.colors.neutral};
    border-bottom: ${({ theme }) => theme.border.thin};
    letter-spacing: -0.47px;
    span {
        text-transform: capitalize;
    }
`

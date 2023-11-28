import { useTranslation } from 'react-i18next'

import { useStoreState, useStoreActions } from '~/store'

import styled from 'styled-components'
import Modal from './Modal'
import Loader from '~/components/Loader'

const ScreenLoader = () => {
    const { t } = useTranslation()
    const { popupsModel: popupsState } = useStoreState(state => state)
    const { popupsModel: popupsActions } = useStoreActions(actions => actions)

    return (
        <Modal
            maxWidth="350px"
            isModalOpen={popupsState.isScreenModalOpen}
            borderRadius="20px"
            closeModal={() => popupsActions.setIsScreenModalOpen(false)}
            showXButton>
            <LoaderContainer>
                <Loader text={t('Initializing...')} />
            </LoaderContainer>
        </Modal>
    )
}

export default ScreenLoader

const LoaderContainer = styled.div`
    padding: 1rem;
    border-radius: 12px;
    border: ${({ theme }) => theme.border.thin};
`

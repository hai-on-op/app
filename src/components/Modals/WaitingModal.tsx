import { useEffect } from 'react'
import { AlertTriangle, CheckCircle } from 'react-feather'
import { useTranslation } from 'react-i18next'

import { useStoreActions, useStoreState } from '~/store'

import styled from 'styled-components'
import { CenteredFlex } from '~/styles'
import Modal from './Modal'
import Button from '~/components/Button'
import { Loader } from '~/components/Loader'
import { AddressLink } from '~/components/AddressLink'

const WaitingModal = () => {
    const { t } = useTranslation()

    const {
        popupsModel: popupsState,
        safeModel: safeState,
    } = useStoreState(state => state)
    const { popupsModel: popupsActions } = useStoreActions(actions => actions)
    const { title, text, hint, status, hash, isCreate } = popupsState.waitingPayload

    useEffect(() => {
        if (!isCreate) return
        
        popupsActions.setIsWaitingModalOpen(false)
        // eslint-disable-next-line
    }, [safeState.list.length])

    const returnStatusIcon = (status: string) => {
        switch(status) {
            case 'success':
                return (
                    <CheckCircle
                        width="60px"
                        className={status}
                    />
                )
            case 'error':
                return (
                    <AlertTriangle
                        width="60px"
                        className={status}
                    />
                )
            default:
                return <Loader size={60} />
        }
    }
    return (
        <Modal
            width="350px"
            isModalOpen={popupsState.isWaitingModalOpen}
            handleModalContent>
            <InnerContainer data-test-id="waiting-modal">
                {returnStatusIcon(status)}
                <Title
                    data-test-id="waiting-modal-title"
                    className={status}>
                    {title || t('initializing')}
                </Title>

                {(text || (status === 'success' && !isCreate)) && (
                    <Text className={status}>
                        {status === 'success' && hash
                            ? (
                                <AddressLink
                                    address={hash}
                                    type="transaction">
                                    {t('view_etherscan')}
                                </AddressLink>
                            )
                            : status === 'success' && isCreate
                                ? (
                                    <CreateNew>
                                        <Loader size={14} /> {text}
                                    </CreateNew>
                                )
                                : text
                        }
                    </Text>
                )}
                {hint && <Hint>{hint}</Hint>}

                {(status !== 'loading' && !isCreate) && (
                    <BtnContainer>
                        <Button
                            text={status === 'success' ? 'close': 'dismiss'}
                            onClick={() => popupsActions.setIsWaitingModalOpen(false)}
                        />
                    </BtnContainer>
                )}
            </InnerContainer>
        </Modal>
    )
}

export default WaitingModal

const InnerContainer = styled.div`
    background: ${({ theme }) => theme.colors.background};
    text-align: center;
    border-radius: 20px;
    padding: 20px 20px 35px 20px;
    svg {
        margin: 25px auto;
        stroke: #4ac6b2;
        path {
            stroke-width: 1 !important;
        }
        &.error {
            stroke: rgb(255, 104, 113);
            stroke-width: 2;
            width: 60px !important;
            height: 60px !important;
            margin-bottom: 20px;
        }
    }
`

const Title = styled.div`
    font-size: ${({ theme }) => theme.font.medium};
    /* color: ${({ theme }) => theme.colors.neutral}; */
    font-weight: 600;
    &.error {
        color: rgb(255, 104, 113);
        font-weight: normal;
    }
`

const Text = styled.div`
    font-size: ${({ theme }) => theme.font.small};
    /* color: ${({ theme }) => theme.colors.neutral}; */
    margin: 10px 0;
`

const Hint = styled.div`
    font-size: ${({ theme }) => theme.font.extraSmall};
    color: ${({ theme }) => theme.colors.secondary};
`

const BtnContainer = styled.div`
    padding: 20px;
    margin: 20px -20px -38px;
    background-color: ${({ theme }) => theme.colors.border};
    border-radius: 0 0 20px 20px;
    text-align: center;
`

const CreateNew = styled(CenteredFlex)`
    svg {
        margin-right: 5px;
    }
`

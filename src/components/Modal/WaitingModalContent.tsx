import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle } from 'react-feather'

import { ActionState } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'

import styled from 'styled-components'
import { CenteredFlex, HaiButton, Text } from '~/styles'
import { type ModalProps } from './index'
import { Loader } from '../Loader'
import { AddressLink } from '../AddressLink'

type WaitingModalContentProps = Pick<ModalProps, 'onClose'> & {
    hideButton?: boolean
}
export function WaitingModalContent({ onClose, hideButton = false }: WaitingModalContentProps) {
    const { t } = useTranslation()
    const {
        waitingPayload: { title: waitingTitle, text, hint, status, hash },
    } = useStoreState(({ popupsModel }) => popupsModel)
    const { setIsWaitingModalOpen } = useStoreActions(({ popupsModel }) => popupsModel)

    const waitingStatusIcon = useMemo(() => {
        switch (status) {
            case ActionState.SUCCESS:
                return <CheckCircle width="60px" />
            case ActionState.ERROR:
                return <AlertTriangle width="60px" />
            default:
                return <Loader size={60} />
        }
    }, [status])

    return (
        <WaitingContainer className={status}>
            {waitingStatusIcon}
            <Text $fontWeight={700}>{waitingTitle || t('initializing')}</Text>
            {!!hash && (
                <AddressLink address={hash} type="transaction">
                    {t('view_etherscan')}
                </AddressLink>
            )}
            {!!text && <Text>{text}</Text>}
            {!!hint && <Text $fontSize="0.8em">{hint}</Text>}
            {!hideButton && status !== ActionState.LOADING && (
                <CenteredFlex $width="100%" style={{ marginTop: '12px' }}>
                    <HaiButton
                        $variant="yellowish"
                        onClick={() => {
                            setIsWaitingModalOpen(false)
                            if (status === ActionState.SUCCESS) {
                                onClose?.()
                            }
                        }}
                    >
                        {status === ActionState.SUCCESS ? 'Close' : 'Dismiss'}
                    </HaiButton>
                </CenteredFlex>
            )}
        </WaitingContainer>
    )
}

const WaitingContainer = styled(CenteredFlex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $gap: 12,
    ...props,
}))`
    padding: 24px;
    & svg {
        stroke: ${({ theme }) => theme.colors.blueish};
        & > path {
            stroke-width: 1 !important;
        }
    }
    &.${ActionState.ERROR} {
        & svg {
            stroke: #ff0000;
            stroke-width: 2;
            width: 60px !important;
            height: 60px !important;
        }
    }
`

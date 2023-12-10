import { type ReactNode, useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CSSTransition } from 'react-transition-group'

import { useStoreActions } from '~/store'

import styled from 'styled-components'
import { CenteredFlex, Flex } from '~/styles'
import Button from '~/components/Button'
import Confetti from '~/components/Confetti'

interface Props {
    title?: string
    children: ReactNode
    submitBtnText?: string
    handleSubmit?: () => void
    maxWidth?: string
    width?: string
    isModalOpen: boolean
    closeModal?: () => void
    handleModalContent?: boolean
    showXButton?: boolean
    borderRadius?: string
    backDropClose?: boolean
    hideHeader?: boolean
    hideFooter?: boolean
    backDropColor?: string
    startConfetti?: boolean
}
const Modal = ({
    title,
    children,
    submitBtnText,
    handleSubmit,
    width,
    maxWidth,
    isModalOpen,
    closeModal,
    handleModalContent,
    showXButton,
    borderRadius,
    backDropClose,
    hideHeader,
    startConfetti = false,
    backDropColor,
}: Props) => {
    const { t } = useTranslation()
    const nodeRef = useRef(null)
    const { settingsModel: settingsActions } = useStoreActions((state) => state)

    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        settingsActions.setBodyOverFlow(isModalOpen)
        setIsOpen(isModalOpen)
        // eslint-disable-next-line
    }, [isModalOpen])

    const handleBackdrop = () => {
        if (!backDropClose || !closeModal) return

        return closeModal()
    }

    if (!isOpen) return null

    return (
        <CSSTransition
            in={isOpen}
            timeout={300}
            appear={isOpen}
            nodeRef={nodeRef}
            classNames="fade"
            unmountOnExit
            mountOnEnter>
            <Container ref={nodeRef}>
                <Confetti start={startConfetti} />
                <InnerContent>
                    <BackDrop
                        bg={backDropColor}
                        onClick={handleBackdrop}
                    />
                    <ChildrenHolder
                        $width={width}
                        $maxWidth={maxWidth}>
                        {handleModalContent
                            ? children
                            : (
                                <ModalContent
                                    $width={width}
                                    $maxWidth={maxWidth}
                                    $borderRadius={borderRadius}>
                                    {!hideHeader && (
                                        <HeaderContainer>
                                            <Header>{title ? t(title): null}</Header>
                                            {!!showXButton && (
                                                <CloseBtn onClick={closeModal}>
                                                    &times;
                                                </CloseBtn>
                                            )}
                                        </HeaderContainer>
                                    )}
                                    <Body>{children}</Body>

                                    {(!showXButton || !!submitBtnText) && (
                                        <Footer>
                                            <Button
                                                variant="dimmed"
                                                onClick={closeModal}
                                                text={t('cancel')}
                                            />
                                            {!!submitBtnText && !!handleSubmit && (
                                                <Button
                                                    withArrow
                                                    onClick={handleSubmit}
                                                    text={t(submitBtnText)}
                                                />
                                            )}
                                        </Footer>
                                    )}
                                </ModalContent>
                            )
                        }
                    </ChildrenHolder>
                </InnerContent>
            </Container>
        </CSSTransition>
    )
}

export default Modal

const Container = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 999;
    overflow-y: auto;
    overflow-x: hidden;
    &.fade-appear {
        opacity: 0;
    }
    &.fade-appear-active {
        opacity: 1;
        transition: all 300ms;
    }
`

const InnerContent = styled(CenteredFlex)`
    min-height: 100vh;
    position: relative;
    padding: 50px 0;
    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 50px 20px;
    `}
`

const ModalContent = styled.div<{ $width?: string, $maxWidth?: string, $borderRadius?: string }>`
    max-width: ${({ $maxWidth = '720px' }) => $maxWidth};
    width: ${({ $width = '100%' }) => $width};
    background: ${({ theme }) => theme.colors.background};
    border-radius: ${({ theme, $borderRadius }) => $borderRadius || theme.global.borderRadius};
    border: ${({ theme }) => theme.border.thin};
`

const Header = styled.div`
    padding: 20px;
    font-size: ${({ theme }) => theme.font.large};
    font-weight: 600;
    color: ${({ theme }) => theme.colors.neutral};
    letter-spacing: -0.47px;
`

const Body = styled.div`
    padding: 20px;
`

const Footer = styled(Flex).attrs(props => ({
    $justify: 'space-between',
    $align: 'center',
    ...props,
}))`
    padding: 20px;
`

const HeaderContainer = styled(Flex).attrs(props => ({
    $justify: 'space-between',
    $align: 'center',
    ...props,
}))`
    border-bottom: ${({ theme }) => theme.border.thin};
`

const CloseBtn = styled.button`
    cursor: pointer;
    border: none;
    box-shadow: none;
    outline: none;
    background: transparent;
    border-radius: 0;
    color: #a4abb7;
    font-size: 30px;
    font-weight: 600;
    line-height: 24px;
    padding: 0;
    margin: 5px 20px 0 0;
`

const BackDrop = styled.div<{ bg?: string }>`
    background: ${({ theme, bg }) => (bg || theme.colors.overlay)};
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
`

const ChildrenHolder = styled.div<{ $width?: string, $maxWidth?: string }>`
    position: relative;
    max-width: ${({ $maxWidth = '720px' }) => $maxWidth};
    width: ${({ $width = '100%' }) => $width};
    z-index: 2;
`

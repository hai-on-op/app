import { createPortal } from 'react-dom'

import type { ReactChildren } from '~/types'

import styled from 'styled-components'
import { CenteredFlex, Flex, createFadeInAnimation } from '~/styles'
import { X } from '../Icons/X'
import { BrandedTitle } from '../BrandedTitle'

export type ModalProps = {
    heading?: ReactChildren,
    children?: ReactChildren,
    footerContent?: ReactChildren,
    overrideContent?: ReactChildren,
    onClose?: () => void,
    maxWidth?: string
}
export function Modal({
    heading,
    children,
    footerContent,
    overrideContent,
    onClose,
    maxWidth
}: ModalProps) {
    return createPortal(
        <Overlay onClick={onClose}>
            <ModalContainer
                $maxWidth={maxWidth}
                onClick={(e: any) => e.stopPropagation()}>
                {overrideContent || (<>
                    <ModalHeader>
                        {typeof heading === 'string'
                            ? (
                                <BrandedTitle
                                    textContent={heading.toUpperCase()}
                                    $fontSize="2.5em"
                                />
                            )
                            : heading
                        }
                        {onClose && (
                            <CloseContainer onClick={onClose}>
                                <X size={14}/>
                            </CloseContainer>
                        )}
                    </ModalHeader>
                    <ModalBody>
                        {children}
                    </ModalBody>
                    <ModalFooter>{footerContent}</ModalFooter>
                </>)}
            </ModalContainer>
        </Overlay>,
        document.body
    )
}

const fadeIn = createFadeInAnimation('24px')

const Overlay = styled(CenteredFlex)`
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;

    background-color: rgba(0,0,0,0.15);
    z-index: 998;
`

export const ModalContainer = styled(Flex).attrs(props => ({
    $column: true,
    $justify: 'stretch',
    $align: 'stretch',
    ...props
}))<{ $maxWidth?: string }>`
    position: fixed;
    /* top: 180px; */
    width: 100%;
    max-width: min(${({ $maxWidth = '720px' }) => $maxWidth}, calc(100vw - 48px));
    /* min-height: 360px; */
    max-height: calc(100vh - 240px);
    z-index: 999;
    animation: ${fadeIn} 0.5s ease forwards;
    backdrop-filter: blur(13px);
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;

    &::before {
        content: '';
        position: absolute;
        inset: 0px;
        border-radius: 24px;
        background-color: rgba(255,255,255,0.3);
        z-index: -1;
    }

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        // top: 120px;
        max-height: calc(100vh - 180px);
    `}
`

export const ModalHeader = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    $grow: 0,
    $shrink: 0,
    ...props
}))`
    padding: 24px 36px;

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 12px 16px;
    `}
`
export const CloseContainer = styled(CenteredFlex)`
    width: 36px;
    height: 36px;
    cursor: pointer;
`

export const ModalBody = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'stretch',
    $align: 'center',
    $grow: 1,
    ...props
}))`
    overflow: hidden auto;
    & > * {
        padding: 24px 36px;
    }

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        & > * {
            padding: 16px;
        }
    `}
`

export const ModalFooter = styled(ModalHeader)``

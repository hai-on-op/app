import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import type { ReactChildren } from '~/types'
import { useStoreState } from '~/store'

import styled from 'styled-components'
import { CenteredFlex, Flex, Title } from '~/styles'
import { X } from '../Icons/X'
import { BrandedTitle } from '../BrandedTitle'
import { FloatingElements, type FloatingElementsProps } from '../BrandElements/FloatingElements'
import { WaitingModalContent } from './WaitingModalContent'

export type ModalProps = {
    heading?: ReactChildren
    children?: ReactChildren
    footerContent?: ReactChildren
    overrideContent?: ReactChildren
    onClose?: () => void
    maxWidth?: string
    ignoreWaiting?: boolean
}
export function Modal({
    heading,
    children,
    footerContent,
    overrideContent,
    onClose,
    maxWidth,
    ignoreWaiting = false,
}: ModalProps) {
    const { isWaitingModalOpen } = useStoreState(({ popupsModel }) => popupsModel)

    const [container, setContainer] = useState<HTMLElement | null>(null)

    useLayoutEffect(() => {
        if (!container) return

        setTimeout(() => {
            container.style.transform = `translateZ(0px)`
        }, 0)

        return () => Object.assign(container.style, { transform: null })
    }, [container])

    return createPortal(
        <Overlay onClick={onClose}>
            <ModalContainer
                ref={setContainer}
                $width={!ignoreWaiting && isWaitingModalOpen ? '350px' : '100%'}
                $maxWidth={maxWidth}
                onClick={(e: any) => e.stopPropagation()}
            >
                <Hideable hidden={!ignoreWaiting && isWaitingModalOpen}>
                    {overrideContent || (
                        <>
                            <ModalHeader>
                                {typeof heading === 'string' ? <BrandedTitle textContent={heading} /> : heading}
                                {onClose && (
                                    <CloseContainer onClick={onClose}>
                                        <X size={14} />
                                    </CloseContainer>
                                )}
                            </ModalHeader>
                            <ModalBody>{children}</ModalBody>
                            <ModalFooter>{footerContent}</ModalFooter>
                        </>
                    )}
                </Hideable>
                {/* handle transaction and other loading/success/error states without overwriting content */}
                {!ignoreWaiting && isWaitingModalOpen && <WaitingModalContent onClose={onClose} />}
                <FloatingElements clouds={clouds} />
            </ModalContainer>
        </Overlay>,
        document.body
    )
}

const Overlay = styled(CenteredFlex)`
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;

    perspective-origin: 50% 50%;
    perspective: 190px;

    background-color: rgba(0, 0, 0, 0.3);
    z-index: 998;
`
Modal.Overlay = Overlay

export const ModalContainer = styled(CenteredFlex)<{ $width?: string; $maxWidth?: string }>`
    position: absolute;
    width: ${({ $width = '100%' }) => $width};
    max-width: min(${({ $maxWidth = '720px' }) => $maxWidth}, calc(100vw - 48px));
    z-index: 999;
    background-color: ${({ theme }) => theme.colors.background};
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    transform-style: preserve-3d;
    transform: translateZ(-1000px);

    transition:
        width 0.5s ease-out,
        height 0.5s ease-out,
        transform 1s cubic-bezier(0.33, 1, 0.68, 1);

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        max-height: calc(100vh - 200px);
    `}
`
Modal.Container = ModalContainer
const Hideable = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'stretch',
    $align: 'stretch',
    ...props,
}))`
    width: 100%;
    height: 100%;
    display: ${({ hidden }) => (hidden ? 'none' : 'flex')};
`

export const ModalHeader = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    $grow: 0,
    $shrink: 0,
    ...props,
}))`
    & > ${Title} {
        font-size: 2.5rem;
    }
    padding: 24px 36px;

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        & > ${Title} {
            font-size: 2rem;
        }
        padding: 20px 16px;
    `}
`
Modal.Header = ModalHeader
export const CloseContainer = styled(CenteredFlex)`
    width: 36px;
    height: 36px;
    cursor: pointer;
`
Modal.Close = CloseContainer

export const ModalBody = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'stretch',
    $align: 'center',
    $grow: 1,
    $gap: 24,
    ...props,
}))`
    overflow: hidden auto;
    padding: 0 36px;

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 0 16px;
    `}
`
Modal.Body = ModalBody

export const ModalFooter = styled(ModalHeader)``
Modal.Footer = ModalFooter

const clouds: FloatingElementsProps['clouds'] = [
    {
        index: 0,
        width: '160px',
        style: {
            right: '-140px',
            bottom: '-190px',
            filter: 'brightness(0.6)',
        },
        flip: true,
        zIndex: -3,
    },
    {
        index: 1,
        width: '220px',
        style: {
            right: '-220px',
            bottom: '-120px',
            filter: 'brightness(0.8)',
        },
        zIndex: -2,
    },
    {
        index: 0,
        width: '200px',
        style: {
            left: '-90px',
            top: 'calc(min(100px, 20vw) - 200px)',
        },
        zIndex: 2,
    },
]

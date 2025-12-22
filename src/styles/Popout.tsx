import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import styled, { css, keyframes } from 'styled-components'
import { Flex, FlexProps } from './Flex'

import popoutSVG from '~/assets/popout.svg'

/* eslint-disable indent */

const anim = (deltaY: number | string, transform = '') => keyframes`
    0% {
        opacity: 0;
        transform: translateY(${deltaY}px) ${transform};
    }
    100% {
        opacity: 1;
        transform: translateY(0px) ${transform};
    }
`

export type PopoutProps = FlexProps & {
    $float?: 'left' | 'center' | 'right'
    $anchor?: 'top' | 'bottom'
    $margin?: string
    $disableAnimation?: boolean
    hidden?: boolean
}

// Base styled component for the popout content
const PopoutStyled = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'center',
    $align: 'center',
    $color: 'inherit',
    ...props,
}))<PopoutProps & { $top?: number; $left?: number; $useBottom?: boolean; $bottom?: number; $transformX?: string }>`
    position: fixed;
    ${({ $useBottom, $top = 0, $bottom = 0 }) =>
        $useBottom
            ? css`
                  bottom: ${$bottom}px;
              `
            : css`
                  top: ${$top}px;
              `}
    left: ${({ $left = 0 }) => $left}px;
    ${({ $transformX }) =>
        $transformX &&
        css`
            transform: translateX(${$transformX});
        `}
    min-width: 100px;
    padding: 18px;
    background-color: ${({ theme }) => theme.colors.background};
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;

    &::after {
        content: '';
        position: absolute;
        ${({ $float = 'center' }) =>
            $float === 'center'
                ? css`
                      left: 50%;
                  `
                : $float === 'left'
                ? css`
                      left: calc(100% - 48px);
                  `
                : css`
                      left: 48px;
                  `}
        ${({ $anchor = 'top' }) =>
            $anchor === 'top'
                ? css`
                      bottom: calc(100% - 0.5px);
                      transform: rotate(0deg);
                  `
                : css`
                      top: calc(100% - 0.5px);
                      transform: rotate(180deg);
                  `}
        width: 52px;
        height: 24px;
        margin-left: -26px;
        background-image: url('${popoutSVG}');
        background-size: contain;
        background-position: center bottom;
        background-repeat: no-repeat;
    }

    ${({ hidden }) =>
        hidden &&
        css`
            display: none;
        `}
    ${({ hidden, $disableAnimation = false, $anchor = 'top', $transformX }) =>
        !hidden &&
        !$disableAnimation &&
        css`
            animation: ${anim($anchor === 'top' ? -8 : 8, $transformX ? `translateX(${$transformX})` : '')} 0.3s ease
                forwards;
        `}

    z-index: 10000;
`

// Portal wrapper component
type PortalPopoutProps = PopoutProps & {
    children?: React.ReactNode
    className?: string
    style?: React.CSSProperties
}

export function Popout({
    hidden = false,
    $anchor = 'top',
    $float = 'center',
    $margin = '0px',
    children,
    className,
    style,
    ...props
}: PortalPopoutProps) {
    const [position, setPosition] = useState({ top: 0, left: 0, bottom: 0, useBottom: false })
    const [mounted, setMounted] = useState(false)
    const placeholderRef = useRef<HTMLDivElement>(null)

    // Parse margin value to number
    const marginValue = parseFloat($margin) || 0

    const updatePosition = useCallback(() => {
        // Find the parent element (the one with position: relative that contains this popout)
        const parentElement = placeholderRef.current?.parentElement
        if (!parentElement) return

        const rect = parentElement.getBoundingClientRect()
        const viewportHeight = window.innerHeight

        let top: number
        let bottom: number
        let left: number
        let useBottom: boolean

        // Calculate vertical position
        if ($anchor === 'top') {
            // Position below the trigger
            top = rect.bottom + marginValue
            bottom = 0
            useBottom = false
        } else {
            // Position above the trigger - use bottom property for correct positioning
            bottom = viewportHeight - rect.top + marginValue
            top = 0
            useBottom = true
        }

        // Calculate horizontal position
        if ($float === 'center') {
            left = rect.left + rect.width / 2
        } else if ($float === 'left') {
            left = rect.right + 8
        } else {
            left = rect.left - 8
        }

        setPosition({ top, left, bottom, useBottom })
    }, [$anchor, $float, marginValue])

    useEffect(() => {
        setMounted(true)
    }, [])

    // Use useLayoutEffect for initial positioning to avoid flash
    useLayoutEffect(() => {
        if (hidden || !mounted) return
        updatePosition()
    }, [hidden, mounted, updatePosition])

    useEffect(() => {
        if (hidden) return

        // Use requestAnimationFrame for smoother updates
        let rafId: number
        const handleUpdate = () => {
            rafId = requestAnimationFrame(() => {
                updatePosition()
            })
        }

        // Update position on scroll and resize
        window.addEventListener('scroll', handleUpdate, true)
        window.addEventListener('resize', handleUpdate)

        return () => {
            window.removeEventListener('scroll', handleUpdate, true)
            window.removeEventListener('resize', handleUpdate)
            cancelAnimationFrame(rafId)
        }
    }, [hidden, updatePosition])

    // Calculate transform for centering
    const transformX = $float === 'center' ? '-50%' : undefined

    // Hidden placeholder to maintain DOM structure and get parent reference
    const placeholder = (
        <div
            ref={placeholderRef}
            style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: 0, height: 0 }}
        />
    )

    if (!mounted) {
        return placeholder
    }

    const popoutContent = (
        <PopoutStyled
            hidden={hidden}
            $anchor={$anchor}
            $float={$float}
            $margin={$margin}
            $top={position.top}
            $left={position.left}
            $bottom={position.bottom}
            $useBottom={position.useBottom}
            $transformX={transformX}
            className={className}
            style={style}
            {...props}
        >
            {children}
        </PopoutStyled>
    )

    return (
        <>
            {placeholder}
            {createPortal(popoutContent, document.body)}
        </>
    )
}

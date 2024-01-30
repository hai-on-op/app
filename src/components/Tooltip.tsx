import { useState } from 'react'

import type { ReactChildren } from '~/types'
import { useOutsideClick } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Popout, type PopoutProps } from '~/styles'
import { Info } from './Icons/Info'

type TooltipProps = PopoutProps & {
    size?: number
    width?: string
    children?: ReactChildren
}
export function Tooltip({ size = 14, width = 'auto', $float, children, ...props }: TooltipProps) {
    const [container, setContainer] = useState<HTMLElement | null>(null)
    const [hovered, setHovered] = useState(false)
    const [clicked, setClicked] = useState(false)

    useOutsideClick(container, () => setClicked(false))

    return (
        <Container
            ref={setContainer}
            $popoutWidth={width}
            $float={$float}
            onClick={() => setClicked((c) => !c)}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
        >
            <Info size={size} />
            <Popout hidden={!hovered && !clicked} $anchor="bottom" $margin="20px" $float={$float} {...props}>
                {children}
            </Popout>
        </Container>
    )
}

const Container = styled(CenteredFlex)<{
    $popoutWidth: string
    $float?: 'left' | 'center' | 'right'
}>`
    position: relative;
    font-size: 0.7rem;

    & ${Popout} {
        width: ${({ $popoutWidth }) => $popoutWidth};
        padding: 18px;
        ${({ $float = 'center' }) => {
            switch ($float) {
                case 'left':
                    return css`
                        right: -44px;
                    `
                case 'right':
                    return css`
                        left: -44px;
                    `
                default:
                    return ''
            }
        }}
    }
`

import { useState } from 'react'

import type { ReactChildren } from '~/types'
import { useOutsideClick } from '~/hooks'

import styled from 'styled-components'
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
            onClick={() => setClicked((c) => !c)}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
        >
            <Info size={size} />
            <Popout
                hidden={!hovered && !clicked}
                $anchor="bottom"
                $margin="20px"
                $float={$float}
                $width={width}
                {...props}
            >
                {children}
            </Popout>
        </Container>
    )
}

const Container = styled(CenteredFlex)`
    position: relative;
    font-size: 0.7rem;
`

import { useState, type ReactNode } from 'react'

import styled from 'styled-components'
import { CenteredFlex, Popout, type PopoutProps } from '~/styles'
import Info from './Icons/Info'

type TooltipProps = PopoutProps & {
    size?: number,
    width?: string,
    children?: JSX.Element | ReactNode | ReactNode[]
}
export function Tooltip({ size = 14, width = 'auto', children, ...props }: TooltipProps) {
    const [hovered, setHovered] = useState(false)

    return (
        <Container
            $popoutWidth={width}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}>
            <Info
                width={size}
                height={size}
            />
            <Popout
                hidden={!hovered}
                $anchor="bottom"
                $margin="20px"
                {...props}>
                {children}
            </Popout>
        </Container>
    )
}

const Container = styled(CenteredFlex)<{ $popoutWidth: string }>`
    position: relative;

    & ${Popout} {
        width: ${({ $popoutWidth }) => $popoutWidth};
        padding: 12px;
    }
`

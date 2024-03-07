import type { ReactChildren } from '~/types'

import styled, { keyframes } from 'styled-components'
import { Flex, type FlexProps } from '~/styles'
import { Loading } from './Icons/Loading'

type LoaderProps = FlexProps & {
    size?: number
    color?: string
    icon?: ReactChildren
    speed?: number
    hideSpinner?: boolean
    children?: ReactChildren
}
export function Loader({ size, color, icon, speed, hideSpinner = false, children, ...props }: LoaderProps) {
    return (
        <Container $justify="center" $align="center" $gap={8} $speed={speed} {...props}>
            {!hideSpinner && (icon || <Loading size={size} stroke={color} />)}
            {children}
        </Container>
    )
}

const rotating = keyframes`
  from {
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  
  to {
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
`
const Container = styled(Flex)<{ $speed?: number }>`
    & > svg:first-child {
        animation: ${rotating} ${({ $speed = 1 }) => (1.5 / ($speed || 1)).toFixed(4)}s linear infinite;
    }
`

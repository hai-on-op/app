import type { ReactChildren } from '~/types'

import styled, { keyframes } from 'styled-components'
import { Flex, type FlexProps } from '~/styles'
import { Loading } from './Icons/Loading'

type LoaderProps = FlexProps & {
    size?: number,
    color?: string,
    hideSpinner?: boolean,
    children?: ReactChildren
}
export function Loader({ size, color, hideSpinner = false, children, ...props }: LoaderProps) {
    return (
        <Container
            $justify="center"
            $align="center"
            $gap={8}
            {...props}>
            {!hideSpinner && (
                <Loading
                    size={size}
                    stroke={color}
                />
            )}
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
const Container = styled(Flex)`
    & > svg:first-child {
        animation: ${rotating} 1.5s linear infinite;
    }
`

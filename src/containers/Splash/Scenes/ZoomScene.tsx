import styled from 'styled-components'
import { CenteredFlex } from '~/styles'

export type ZoomSceneProps = {
    zIndex: number
}

export const ZoomScene = styled(CenteredFlex)<{ $zIndex: number }>`
    position: absolute;
    transform-style: preserve-3d;
    z-index: ${({ $zIndex }) => $zIndex};
    overflow: visible;
`

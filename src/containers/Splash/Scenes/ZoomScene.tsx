import styled from 'styled-components'
import { CenteredFlex } from '~/styles'

export type SplashImage = {
    index: number
    width: string,
    style?: object,
    rotation?: number,
    flip?: boolean,
    zIndex?: number
}

export type ZoomSceneProps = {
    zIndex: number
}

export const ZoomScene = styled(CenteredFlex)<{ $zIndex: number }>`
    position: absolute;
    transform-style: preserve-3d;
    z-index: ${({ $zIndex }) => $zIndex};
`
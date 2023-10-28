import styled from 'styled-components'
import { CenteredFlex } from '~/styles'

export type SplashImage = {
    index: number
    width: string,
    position: [ string, string, number ],
    rotation?: number,
    flip?: boolean,
    deltaZ?: number,
    zIndex?: number
}

export const ZoomScene = styled(CenteredFlex)`
    position: absolute;
    width: 100%;
    height: 100%;
`
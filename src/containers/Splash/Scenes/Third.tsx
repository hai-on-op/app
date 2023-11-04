import styled from 'styled-components'
import { CenteredFlex } from '~/styles'
import { ZoomScene, type ZoomSceneProps } from './ZoomScene'
import { BrandedTitle } from '~/components/BrandedTitle'

export function Third({ zIndex }: ZoomSceneProps) {
    return (
        <ZoomScene
            $zIndex={zIndex}
            style={{ marginTop: '100px' }}>
            <Container>
                <BrandedTitle textContent="PID CONTROLLER ANALOGY VISUAL TO BE DESIGNED"/>
            </Container>
        </ZoomScene>
    )
}

const Container = styled(CenteredFlex)`
    max-width: min(1100px, calc(100vw - 48px));
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    /* background-color: #f1f1fb77; */
    /* backdrop-filter: blur(13px); */
    background-color: rgba(255,255,255,0.4);
    padding: 48px;
`

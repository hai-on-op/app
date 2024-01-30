import { AvatarComponent } from '@rainbow-me/rainbowkit'

import styled from 'styled-components'
import { CenteredFlex } from '~/styles'
import { HaiFace } from './Icons/HaiFace'

export const CustomAvatar: AvatarComponent = ({ address, ensImage, size }) => {
    if (ensImage)
        return <img src={ensImage} alt={address} width={size} height={size} style={{ borderRadius: '999px' }} />

    return (
        <Container $size={size}>
            <HaiFace filled />
        </Container>
    )
}

const Container = styled(CenteredFlex)<{ $size: number }>`
    width: ${({ $size }) => $size}px;
    height: ${({ $size }) => $size}px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.greenish};
    border: ${({ theme }) => theme.border.medium};

    & > svg {
        width: 70%;
        height: auto;
    }
`

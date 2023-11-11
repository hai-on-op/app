import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import HaiFace from './Icons/HaiFace'
import { Elf } from './Elf'

export function HaiAlert() {
    return (
        <Container>
            <CenteredFlex $gap={24}>
                <HaiIconContainer>
                    <HaiFace filled/>
                </HaiIconContainer>
                <Text>
                    <strong>$HAI ALERT</strong>
                    {` • `}
                    MARKET PRICE <strong>$1.00</strong>
                    {` • `}
                    REDEMPTION PRICE <strong>$1.15</strong>
                    {` • `}
                    PRICE DIFFERENCE <strong>15%</strong>
                </Text>
            </CenteredFlex>
            <ElfContainer>
                <Elf
                    variant={1}
                    width="50%"
                    animated
                    style={{ bottom: '0px', left: '0px', zIndex: 0 }}
                />
                <Elf
                    variant={0}
                    width="70%"
                    animated
                    style={{
                        bottom: '0px',
                        right: '6%',
                        transform: 'rotate(-10deg)',
                        zIndex: 1
                    }}
                />
                <Elf
                    variant={2}
                    width="40%"
                    animated
                    style={{
                        transform: 'scaleX(-1)',
                        bottom: '0px',
                        right: '0px',
                        zIndex: 0
                    }}
                />
            </ElfContainer>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    ...props
}))`
    position: fixed;
    left: 0px;
    right: 0px;
    bottom: 0px;
    height: 80px;
    padding-left: 24px;
    border-top: ${({ theme }) => theme.border.medium};
    background: ${({ theme }) => theme.colors.gradientSecondary};
`
const HaiIconContainer = styled(CenteredFlex)`
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: ${({ theme }) => theme.border.medium};
    background-color: ${({ theme }) => theme.colors.greenish};
    & > svg {
        width: 70%;
        height: auto;
    }
`

const ElfContainer = styled(CenteredFlex)`
    position: relative;
    width: 180px;
    height: 100%;
    overflow: visible;
    pointer-events: none;
`
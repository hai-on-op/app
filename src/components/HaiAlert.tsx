import { useMediaQuery } from '~/hooks'
import { useAnalytics } from '~/providers/AnalyticsProvider'

import styled, { keyframes } from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import { HaiFace } from './Icons/HaiFace'
import { Elf } from './BrandElements/Elf'

export function HaiAlert() {
    const isLargerThanSmall = useMediaQuery('upToSmall')

    const { data: { marketPrice, redemptionPrice, priceDiff } } = useAnalytics()

    return (
        <Container>
            <CenteredFlex $gap={24}>
                <HaiIconContainer>
                    <HaiFace filled/>
                </HaiIconContainer>
                <Text>
                    <strong>$HAI ALERT</strong>
                    {` • `}
                    {isLargerThanSmall ? `MARKET PRICE `: `MP `}<strong>{marketPrice.formatted}</strong>
                    {` • `}
                    {isLargerThanSmall ? `REDEMPTION PRICE `: `RP `}<strong>{redemptionPrice.formatted}</strong>
                    {` • `}
                    {isLargerThanSmall ? `PRICE DIFFERENCE `: `DIFF. `}<strong>{parseFloat(priceDiff.toFixed(2))}%</strong>
                </Text>
            </CenteredFlex>
            <ElfContainer>
                <Elf
                    variant={1}
                    width="50%"
                    animated
                    style={{
                        bottom: '0px',
                        left: '0px',
                        zIndex: 0
                    }}
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

const popup = keyframes`
    0% { bottom: -80px; }
    100% { bottom: 0px; }
`
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
    bottom: -80px;
    height: 80px;
    padding-left: 24px;
    border-top: ${({ theme }) => theme.border.medium};
    background: ${({ theme }) => theme.colors.gradientSecondary};
    animation: ${popup} 0.5s ease forwards;
`
const HaiIconContainer = styled(CenteredFlex).attrs(props => ({
    $shrink: 0,
    ...props
}))`
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: ${({ theme }) => theme.border.thin};
    background-color: ${({ theme }) => theme.colors.greenish};
    & > svg {
        width: 80%;
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
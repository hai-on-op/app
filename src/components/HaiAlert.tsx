import { useMemo } from 'react'

import type { SetState } from '~/types'
import { Status } from '~/utils'
import { useMediaQuery } from '~/hooks'
import { useAnalytics } from '~/providers/AnalyticsProvider'

import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import { HaiFace } from './Icons/HaiFace'
import { Elf } from './BrandElements/Elf'
import { ChevronLeft } from 'react-feather'
import { StatusLabel } from './StatusLabel'

type HaiAlertProps = {
    active: boolean
    setActive: SetState<boolean>
}
export function HaiAlert({ active, setActive }: HaiAlertProps) {
    const isUpToSmall = useMediaQuery('upToSmall')

    const {
        data: { redemptionPrice },
        graphSummary,
        haiMarketPrice,
    } = useAnalytics()

    const priceDiff = useMemo(() => {
        return 100 * Math.abs(1 - parseFloat(haiMarketPrice.raw) / parseFloat(redemptionPrice.raw))
    }, [redemptionPrice.raw, haiMarketPrice.raw])

    return (
        <Container $active={active}>
            <HaiIconContainer $active={active} onClick={() => setActive((a) => !a)}>
                <ChevronLeft />
                <StatusLabel status={Status.UNKNOWN} unpadded $padding="2px 8px 2px 4px">
                    <HaiFace size={18} filled />
                    <Text $fontWeight={700}>HAI</Text>
                </StatusLabel>
                <Text $fontWeight={700}>PRICE ALERT</Text>
            </HaiIconContainer>
            <CenteredFlex $width="100%">
                <Text>
                    {isUpToSmall ? `MP ` : `MARKET PRICE `}
                    <strong>{haiMarketPrice.formatted}</strong>
                    {` • `}
                    {isUpToSmall ? `RP ` : `REDEMPTION PRICE `}
                    <strong>{redemptionPrice.formatted}</strong>
                    {` • `}
                    {isUpToSmall ? `DIFF. ` : `PRICE DIFFERENCE `}
                    <strong>{parseFloat(priceDiff.toFixed(2))}%</strong>
                    {` • `}
                    {isUpToSmall ? `RATE ` : `REDEMPTION RATE `}
                    <strong>{graphSummary?.redemptionRate.formatted || '--%'}</strong>
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
                        zIndex: 0,
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
                        zIndex: 1,
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
                        zIndex: 0,
                    }}
                />
            </ElfContainer>
        </Container>
    )
}

const Container = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    ...props,
}))<{ $active: boolean }>`
    position: fixed;
    right: 0px;
    bottom: 0px;
    left: ${({ $active }) => ($active ? '0vw' : '100vw')};
    height: 80px;
    border-top: ${({ theme }) => theme.border.medium};
    background: ${({ theme }) => theme.colors.gradientSecondary};
    transition: left 1s ease;
    overflow: visible;

    & > *:nth-child(2) {
        margin-right: 208px;
        transition: opacity 0.25s ease;
        transition-delay: ${({ $active }) => ($active ? '0.75s' : '0s')};
        opacity: ${({ $active }) => ($active ? 1 : 0)};
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        font-size: ${theme.font.small};
        & > *:nth-child(2) {
            margin-right: 120px;
        }
    `}

    z-index: 10;
`
const HaiIconContainer = styled(Flex).attrs((props) => ({
    $justify: 'space-between',
    $align: 'center',
    $shrink: 0,
    $gap: 8,
    $fontSize: '0.875rem',
    $fontWeight: 700,
    ...props,
}))<{ $active: boolean }>`
    height: 40px;
    padding-left: 12px;
    padding-right: 16px;
    margin-left: 24px;
    border-radius: 999px;
    border: ${({ theme }) => theme.border.medium};
    background-color: ${({ theme }) => theme.colors.yellowish};
    transform: translateX(${({ $active }) => ($active ? 'calc(0% + 0px)' : 'calc(-93% - 24px)')});
    transition: all 1s ease;

    & > svg {
        width: 18px;
        height: auto;
        transform: rotate(${({ $active }) => ($active ? 180 : 0)}deg);
        transition: transform 1s ease;
    }

    ${({ theme, $active }) => theme.mediaWidth.upToSmall`
        height: 32px;
        padding: 0px 4px;
        margin-left: 12px;
        transform: translateX(${$active ? 'calc(0% + 0px)' : 'calc(-93% - 8px)'});
        & > ${Text} {
            display: none;
        }
    `}

    cursor: pointer;
    z-index: 1;
`

const ElfContainer = styled(CenteredFlex)`
    position: fixed;
    right: 0px;
    width: 180px;
    height: 80px;
    overflow: visible;
    pointer-events: none;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        right: -20px;
        width: 140px;
    `}
`

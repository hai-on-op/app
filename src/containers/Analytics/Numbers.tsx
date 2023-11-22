import { useState } from 'react'

import { Timeframe } from '~/utils'
import { useAnalytics } from './AnalyticsProvider'

import styled from 'styled-components'
import {
    BlurContainer,
    CenteredFlex,
    type DashedContainerProps,
    DashedContainerStyle,
    Flex,
    type FlexProps,
    FlexStyle,
    Text
} from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { Stat, Stats } from '~/components/Stats'
import { ToggleSlider } from '~/components/ToggleSlider'
import { LineChart } from '~/components/Charts/Line'
import { useDummyData } from '~/components/Charts/Line/useDummyData'
import { PriceDisplay } from './PriceDisplay'
import { Tooltip } from '~/components/Tooltip'

const dummyPriceDataBase = [
    {
        id: 'Market Price',
        color: 'hsl(49, 84%, 68%)'
    },
    {
        id: 'Redemption Price',
        color: 'hsl(115, 70%, 84%)'
    }
]

const dummyRedemptionDataBase = [
    {
        id: 'Redemption Rate',
        color: 'hsl(115, 70%, 84%)'
    }
]

export function Numbers() {
    const {
        erc20Supply,
        marketPrice,
        redemptionPrice,
        annualRate,
        eightRate,
        pRate,
        iRate,
        surplusInTreasury,
        globalDebt
    } = useAnalytics()

    const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.ONE_WEEK)

    // TODO: remove and use actual data
    const dummyPriceData = useDummyData(dummyPriceDataBase, {
        timeframe,
        min: 0.9,
        max: 1.1
    })
    const dummyRedemptionData = useDummyData(dummyRedemptionDataBase, {
        min: 0.01,
        max: 0.1
    })

    return (
        <Container>
            <Section>
                <BrandedTitle
                    textContent="HAI LEVEL NUMBERS"
                    $fontSize="3rem"
                />
                <Text>Explore global HAI protocol analytics.</Text>
                <Stats>
                    <Stat stat={{
                        header: '$45,600',
                        label: 'Total Collateral Locked',
                        tooltip: 'Hello world'
                    }}/>
                    <Stat stat={{
                        header: erc20Supply,
                        label: 'Outstanding $HAI',
                        tooltip: 'Hello world'
                    }}/>
                    <Stat stat={{
                        header: '75%',
                        label: 'Global CR',
                        tooltip: 'Hello world'
                    }}/>
                    <Stat stat={{
                        header: '876',
                        label: 'Total Active Vaults',
                        tooltip: 'Hello world'
                    }}/>
                </Stats>
            </Section>
            <Section>
                <SectionHeader>PRICES</SectionHeader>
                <SectionContent>
                    <Flex
                        $width="100%"
                        $justify="space-between"
                        $align="center"
                        $gap={24}>
                        <Flex
                            $justify="flex-start"
                            $align="center"
                            $gap={24}>
                            <PriceDisplay
                                token="HAI"
                                price={marketPrice}
                                label="$HAI Market Price"
                                tooltip="blarn"
                            />
                            <PriceDisplay
                                token="HAI"
                                price={redemptionPrice}
                                label="$HAI Redemption Price"
                                tooltip="blarn"
                            />
                        </Flex>
                        <ToggleSlider
                            selectedIndex={timeframe}
                            setSelectedIndex={(index: number) => {
                                setTimeframe(index)
                            }}>
                            <TimeframeLabel>24HR</TimeframeLabel>
                            <TimeframeLabel>1WK</TimeframeLabel>
                            <TimeframeLabel>1M</TimeframeLabel>
                            <TimeframeLabel>1YR</TimeframeLabel>
                        </ToggleSlider>
                    </Flex>
                    <ChartContainer>
                        <LineChart
                            data={dummyPriceData}
                            timeframe={timeframe}
                            yScale={{
                                type: 'linear',
                                min: 0.9,
                                max: 1.1
                            }}
                            axisRight={{
                                format: value => `$${value}`
                            }}
                        />
                    </ChartContainer>
                </SectionContent>
            </Section>
            <Section>
                <SectionHeader>REDEMPTION</SectionHeader>
                <SectionContent>
                    <Flex
                        $width="100%"
                        $justify="flex-start"
                        $align="center"
                        $gap={36}>
                        <RedemptionRateHeaderItem>
                            <Text>{annualRate}</Text>
                            <Flex
                                $align="center"
                                $gap={4}>
                                <Text>Annual Redemption Rate</Text>
                                <Tooltip>Hello world</Tooltip>
                            </Flex>
                        </RedemptionRateHeaderItem>
                        <RedemptionRateHeaderItem>
                            <Text>{eightRate}</Text>
                            <Flex
                                $align="center"
                                $gap={4}>
                                <Text>Main Rate</Text>
                                <Tooltip>Hello world</Tooltip>
                            </Flex>
                        </RedemptionRateHeaderItem>
                        <RedemptionRateHeaderItem>
                            <Text>{pRate}</Text>
                            <Flex
                                $align="center"
                                $gap={4}>
                                <Text>pRate</Text>
                                <Tooltip>Hello world</Tooltip>
                            </Flex>
                        </RedemptionRateHeaderItem>
                        <RedemptionRateHeaderItem>
                            <Text>{iRate}</Text>
                            <Flex
                                $align="center"
                                $gap={4}>
                                <Text>iRate</Text>
                                <Tooltip>Hello world</Tooltip>
                            </Flex>
                        </RedemptionRateHeaderItem>
                    </Flex>
                    <ChartContainer>
                        <LineChart
                            data={dummyRedemptionData}
                            timeframe={timeframe}
                            yScale={{
                                type: 'linear',
                                min: 0.01,
                                max: 0.10
                            }}
                            axisRight={{
                                format: value => parseFloat((100 * value).toFixed(2)) + '%'
                            }}
                        />
                    </ChartContainer>
                </SectionContent>
            </Section>
            <Section>
                <SectionHeader>LIQUIDITY</SectionHeader>
            </Section>
            <Section>
                <SectionHeader>PROTOCOL BALANCE</SectionHeader>
                <Stats>
                    <Stat stat={{
                        header: '$45,600',
                        label: 'System Surplus',
                        tooltip: 'Hello world'
                    }}/>
                    <Stat stat={{
                        header: surplusInTreasury,
                        label: 'Surplus in Treasury',
                        tooltip: `Total HAI accrued by the system's stability fees. It's stored in the Stability Fee Treasury accountance`
                    }}/>
                    <Stat stat={{
                        header: globalDebt,
                        label: 'Debt to Settle',
                        tooltip: 'Total HAI minted in the system'
                    }}/>
                </Stats>
            </Section>
        </Container>
    )
}

const Container = styled(BlurContainer).attrs(props => ({
    $width: '100%',
    $gap: 24,
    ...props
}))`
    padding: 48px;
    & > * {
        padding: 0px;
    }
`

const Section = styled.section.attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 24,
    ...props
}))<FlexProps>`
    ${FlexStyle}
`

const SectionHeader = styled(Text).attrs(props => ({
    $fontSize: '1.4rem',
    $fontWeight: 700,
    ...props
}))``

const SectionContent = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 24,
    $borderOpacity: 0.2,
    ...props
}))<DashedContainerProps>`
    ${DashedContainerStyle}
    padding: 24px;
`

const ChartContainer = styled(CenteredFlex)`
    width: 100%;
    height: 240px;
    border-radius: 24px;
    overflow: visible;
    background: ${({ theme }) => theme.colors.gradientCool};

    & svg {
        overflow: visible;
    }
`

const TimeframeLabel = styled(CenteredFlex)`
    width: 48px;
    height: 36px;
    font-size: 0.8rem;
    font-weight: 700;
`

const RedemptionRateHeaderItem = styled(Flex).attrs(props => ({
    $column: true,
    $justify: 'center',
    $align: 'flex-start',
    $gap: 4,
    ...props
}))`
    & > * {
        &:nth-child(1) {
            font-size: 1.54rem;
            font-weight: 700;
        }
        &:nth-child(2) {
            & > ${Text} {
                font-size: 0.7rem;
            }
        }
    }
`

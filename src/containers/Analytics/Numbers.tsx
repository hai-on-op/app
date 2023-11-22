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
import { useDummyData as useDummyLineData } from '~/components/Charts/Line/useDummyData'
import { useDummyData as useDummyPieData } from '~/components/Charts/Pie/useDummyData'
import { PriceDisplay } from './PriceDisplay'
import { PieChart } from '~/components/Charts/Pie'
import { Legend } from '~/components/Charts/Legend'

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

const dummyPieDataBase = [
    {
        id: 'HAI in Liquidity Pools',
        color: 'hsl(49, 84%, 68%)'
    },
    {
        id: 'UniV3 Pool',
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
    const dummyPriceData = useDummyLineData(dummyPriceDataBase, {
        timeframe,
        min: 0.9,
        max: 1.1
    })
    const dummyRedemptionData = useDummyLineData(dummyRedemptionDataBase, {
        min: 0.01,
        max: 0.1
    })
    const dummyPieData = useDummyPieData(dummyPieDataBase, {
        min: 30_000,
        max: 100_000
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
                                format: value => `$${parseFloat(parseFloat(value).toFixed(3))}`
                            }}
                        />
                        <Legend data={dummyPriceData}/>
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
                        <Stat
                            stat={{
                                header: annualRate,
                                label: 'Annual Redemption Rate',
                                tooltip: 'Hello world'
                            }}
                            unbordered
                        />
                        <Stat
                            stat={{
                                header: eightRate,
                                label: 'Main Rate',
                                tooltip: 'Hello world'
                            }}
                            unbordered
                        />
                        <Stat
                            stat={{
                                header: pRate,
                                label: 'pRate',
                                tooltip: 'Hello world'
                            }}
                            unbordered
                        />
                        <Stat
                            stat={{
                                header: iRate,
                                label: 'iRate',
                                tooltip: 'Hello world'
                            }}
                            unbordered
                        />
                    </Flex>
                    <ChartContainer>
                        <LineChart
                            data={dummyRedemptionData}
                            timeframe={Timeframe.ONE_WEEK}
                            yScale={{
                                type: 'linear',
                                min: 0.01,
                                max: 0.10
                            }}
                            axisRight={{
                                format: value => parseFloat((100 * value).toFixed(2)) + '%'
                            }}
                        />
                        <Legend data={dummyRedemptionData}/>
                    </ChartContainer>
                </SectionContent>
            </Section>
            <Section>
                <SectionHeader>LIQUIDITY</SectionHeader>
                <SectionContent $gap={0}>
                    <Flex
                        $width="100%"
                        $justify="flex-start"
                        $align="center"
                        $gap={36}>
                        <Stat
                            stat={{
                                header: `$${dummyPieData[0].value.toLocaleString('en-US', {
                                    maximumFractionDigits: 2
                                })}`,
                                label: 'HAI in Liquidity Pools',
                                tooltip: 'Hello world'
                            }}
                            unbordered
                        />
                        <Stat
                            stat={{
                                header: `$${dummyPieData[1].value.toLocaleString('en-US', {
                                    maximumFractionDigits: 2
                                })}`,
                                label: 'UNIv3 Pool',
                                tooltip: 'Hello world'
                            }}
                            unbordered
                        />
                        <Stat
                            stat={{
                                header: '$XX,XXX',
                                label: 'Depth to Equilibrium',
                                tooltip: 'Hello world'
                            }}
                            unbordered
                        />
                    </Flex>
                    <PieContainer>
                        <PieChart
                            data={dummyPieData}
                            valueFormat={value => '$' + value.toLocaleString('en-US', {
                                maximumFractionDigits: 2
                            })}
                        />
                        <Legend
                            $column
                            data={dummyPieData}
                            style={{ top: 'calc(50% - 96px)' }}
                        />
                    </PieContainer>
                </SectionContent>
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
    position: relative;
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

const PieContainer = styled(CenteredFlex)`
    position: relative;
    width: 100%;
    height: 400px;
    flex-grow: 1;
    flex-shrink: 1;
    overflow: visible;
    
    &::before {
        content: '';
        position: absolute;
        left: 0px;
        right: 0px;
        height: 240px;
        border-radius: 24px;
        background: ${({ theme }) => theme.colors.gradientCool};
        z-index: 0;
    }
`

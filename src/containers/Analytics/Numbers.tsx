import { useMemo, useState } from 'react'

import { formatNumberWithStyle, getRatePercentage } from '~/utils'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import {
    BlurContainer,
    CenteredFlex,
    type DashedContainerProps,
    DashedContainerStyle,
    Flex,
    type FlexProps,
    FlexStyle,
    Text,
} from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { Stat, Stats } from '~/components/Stats'
import { ToggleSlider } from '~/components/ToggleSlider'
import { LineChart } from '~/components/Charts/Line'
import { useDummyData as useDummyPieData } from '~/components/Charts/Pie/useDummyData'
import { PriceDisplay } from './PriceDisplay'
import { PieChart } from '~/components/Charts/Pie'
import { Legend } from '~/components/Charts/Legend'
import { ComingSoon } from '~/components/ComingSoon'

const dummyPieDataBase = [
    {
        id: 'HAI in Liquidity Pools',
        color: 'hsl(49, 84%, 68%)',
    },
    {
        id: 'UniV3 Pool',
        color: 'hsl(115, 70%, 84%)',
    },
]
const dummyPieOptions = {
    min: 30_000,
    max: 100_000,
}

// TODO: check to make sure data usage and calculations are correct, fill out tooltips
export function Numbers() {
    const {
        data: { erc20Supply, marketPrice, redemptionPrice, annualRate, pRate, iRate, surplusInTreasury },
        graphSummary,
        haiPriceHistory,
        redemptionRateHistory,
    } = useAnalytics()

    const haiPriceData = useMemo(() => {
        const data = haiPriceHistory.data?.dailyStats || haiPriceHistory.data?.hourlyStats || []
        return [
            {
                id: 'Market Price',
                color: 'hsl(49, 84%, 68%)',
                data: data.map(({ timestamp, marketPriceUsd }) => ({
                    x: new Date(Number(timestamp) * 1000),
                    y: parseFloat(marketPriceUsd),
                })),
            },
            {
                id: 'Redemption Price',
                color: 'hsl(115, 70%, 84%)',
                data: data.map(({ timestamp, redemptionPrice }) => ({
                    x: new Date(Number(timestamp) * 1000),
                    y: parseFloat(redemptionPrice.value),
                })),
            },
        ]
    }, [haiPriceHistory])

    const redemptionRateData = useMemo(() => {
        const data = haiPriceHistory.data?.dailyStats || haiPriceHistory.data?.hourlyStats || []
        return [
            {
                id: 'Redemption Rate',
                color: 'hsl(115, 70%, 84%)',
                data: data.map(({ timestamp, redemptionRate }) => ({
                    x: new Date(Number(timestamp) * 1000),
                    y: getRatePercentage(redemptionRate.annualizedRate, 4),
                })),
            },
        ]
    }, [redemptionRateHistory])

    const [convertPieToUSD, setConvertPieToUSD] = useState(true)
    // TODO: remove and use actual data
    const dummyPieData = useDummyPieData(dummyPieDataBase, dummyPieOptions)

    const isLargerThanSmall = useMediaQuery('upToSmall')

    return (
        <Container>
            <Section>
                <BrandedTitle textContent="HAI LEVEL NUMBERS" $fontSize="3rem" />
                <SectionHeader>IMPORTANT STUFF</SectionHeader>
                <Stats>
                    <Stat
                        stat={{
                            header: graphSummary?.totalCollateralLocked.formatted || '--',
                            label: 'Total Collateral Locked',
                            tooltip: `Dollar value of all collateral currently locked in active vaults`,
                        }}
                    />
                    <Stat
                        stat={{
                            header: erc20Supply.raw
                                ? erc20Supply.formatted
                                : graphSummary?.erc20Supply.formatted || '--',
                            label: 'Outstanding $HAI',
                            tooltip: 'Total amount of HAI issued',
                        }}
                    />
                    <Stat
                        stat={{
                            header: graphSummary?.globalCRatio.formatted || '--%',
                            label: 'Global CRatio',
                            tooltip: `Ratio of the dollar value  of all collateral locked in vaults relative to the dollar value of all outstanding debt`,
                        }}
                    />
                    <Stat
                        stat={{
                            header: graphSummary?.totalVaults.formatted,
                            label: 'Total Active Vaults',
                            tooltip: 'The total number of active vaults in the system',
                        }}
                    />
                </Stats>
            </Section>
            <Section>
                <SectionHeader>PRICES</SectionHeader>
                <SectionContent>
                    <Flex
                        $column={!isLargerThanSmall}
                        $width="100%"
                        $justify="space-between"
                        $align={!isLargerThanSmall ? 'flex-start' : 'center'}
                        $gap={24}
                    >
                        <Flex
                            $column={!isLargerThanSmall}
                            $justify="flex-start"
                            $align={!isLargerThanSmall ? 'flex-start' : 'center'}
                            $gap={24}
                        >
                            <PriceDisplay
                                token="HAI"
                                price={marketPrice.formatted}
                                label="$HAI Market Price"
                                tooltip={`Time-weighted average HAI market price derived from UniV3 HAI/WETH pool and Chainlink WETH/USD feed.`}
                            />
                            <PriceDisplay
                                token="HAI"
                                price={
                                    redemptionPrice.raw
                                        ? redemptionPrice.formatted
                                        : graphSummary?.redemptionPrice.formatted || '$--'
                                }
                                label="$HAI Redemption Price"
                                tooltip={`HAI's "moving peg". It's the price at which HAI is minted or repaid inside the protocol. The HAI market price is expected to fluctuate around the redemption price.`}
                            />
                        </Flex>
                        <ToggleSlider
                            selectedIndex={haiPriceHistory.timeframe}
                            setSelectedIndex={haiPriceHistory.setTimeframe}
                        >
                            <TimeframeLabel>24HR</TimeframeLabel>
                            <TimeframeLabel>1WK</TimeframeLabel>
                            <TimeframeLabel>1M</TimeframeLabel>
                            {/* <TimeframeLabel>1YR</TimeframeLabel> */}
                        </ToggleSlider>
                    </Flex>
                    <ChartContainer>
                        <LineChart
                            data={haiPriceData}
                            timeframe={haiPriceHistory.timeframe}
                            yScale={{
                                type: 'linear',
                                // min: 0.9,
                                // max: 1.1
                            }}
                            axisRight={{
                                format: (value) =>
                                    formatNumberWithStyle(value, {
                                        minDecimals: 2,
                                        minSigFigs: 2,
                                        style: 'currency',
                                    }),
                            }}
                        />
                        <Legend data={haiPriceData} />
                    </ChartContainer>
                </SectionContent>
            </Section>
            <Section>
                <SectionHeader>REDEMPTION RATE</SectionHeader>
                <SectionContent>
                    <Flex
                        $column={!isLargerThanSmall}
                        $width="100%"
                        $justify="space-between"
                        $align={!isLargerThanSmall ? 'flex-start' : 'center'}
                        $gap={24}
                    >
                        <Flex
                            $column={!isLargerThanSmall}
                            $width="100%"
                            $justify="flex-start"
                            $align={!isLargerThanSmall ? 'flex-start' : 'center'}
                            $gap={!isLargerThanSmall ? 12 : 36}
                        >
                            <Stat
                                stat={{
                                    header: annualRate.raw
                                        ? annualRate.formatted
                                        : graphSummary?.redemptionRate.formatted || '--%',
                                    label: 'Annual Redemption Rate',
                                    tooltip: `Annualized rate of change of the redemption price. The rate is set by the PI controller and depends on the deviation between the redemption price and the HAI TWAP price. If the rate is positive, the redemption price will increase. If the rate is negative, the redemption price will decrease. The rate is generated by the combinated effect of two terms: pRate and iRate.`,
                                }}
                                unbordered
                            />
                            <CenteredFlex $gap={!isLargerThanSmall ? 12 : 36}>
                                <Stat
                                    stat={{
                                        header: pRate.formatted || '--%',
                                        label: 'pRate',
                                        tooltip: `Proportional rate of controller. This rate increases and decreases based on the current error between the market price and redemption price. This component acts quickly to encourage stability during short-term shocks.`,
                                    }}
                                    unbordered
                                />
                                <Stat
                                    stat={{
                                        header: iRate.formatted || '--%',
                                        label: 'iRate',
                                        tooltip: `Integral rate of controller. This rate increases and decreases based on the historical error between the market price and redemption price. This component acts slowly, but is better at handling long-term spreads.`,
                                    }}
                                    unbordered
                                />
                            </CenteredFlex>
                        </Flex>
                        <ToggleSlider
                            selectedIndex={redemptionRateHistory.timeframe}
                            setSelectedIndex={redemptionRateHistory.setTimeframe}
                        >
                            <TimeframeLabel>24HR</TimeframeLabel>
                            <TimeframeLabel>1WK</TimeframeLabel>
                            <TimeframeLabel>1M</TimeframeLabel>
                            {/* <TimeframeLabel>1YR</TimeframeLabel> */}
                        </ToggleSlider>
                    </Flex>
                    <ChartContainer>
                        <LineChart
                            data={redemptionRateData}
                            timeframe={redemptionRateHistory.timeframe}
                            yScale={{
                                type: 'linear',
                                // min: 1,
                                // max: 10
                            }}
                            axisRight={{
                                format: (value) => parseFloat(parseFloat(value.toString()).toFixed(2)) + '%',
                            }}
                        />
                        <Legend data={redemptionRateData} />
                    </ChartContainer>
                </SectionContent>
            </Section>
            <Section>
                <SectionHeader>HAI LIQUIDITY</SectionHeader>
                <SectionContent $gap={0}>
                    <Flex
                        $column={!isLargerThanSmall}
                        $width="100%"
                        $justify="space-between"
                        $align={!isLargerThanSmall ? 'flex-start' : 'center'}
                        $gap={24}
                    >
                        <Flex
                            $column={!isLargerThanSmall}
                            $width="100%"
                            $justify="flex-start"
                            $align={!isLargerThanSmall ? 'flex-start' : 'center'}
                            $gap={!isLargerThanSmall ? 12 : 36}
                        >
                            <Stat
                                stat={{
                                    header: (
                                        <ComingSoon $justify="flex-start" $fontSize="1.2rem">
                                            {convertPieToUSD
                                                ? formatNumberWithStyle(
                                                      dummyPieData[0].value * parseFloat(redemptionPrice.raw),
                                                      {
                                                          maxDecimals: 2,
                                                          style: 'currency',
                                                      }
                                                  )
                                                : formatNumberWithStyle(dummyPieData[0].value, { maxDecimals: 0 })}
                                        </ComingSoon>
                                    ),
                                    label: 'HAI in Liquidity Pools',
                                    tooltip: `Amount of HAI locked in tracked liquidity pools`,
                                }}
                                unbordered
                            />
                            {/* <Stat
                                stat={{
                                    header: (
                                        <ComingSoon $justify="flex-start" $fontSize="1.2rem">
                                            {`$${dummyPieData[1].value.toLocaleString('en-US', {
                                                maximumFractionDigits: 2,
                                            })}`}
                                        </ComingSoon>
                                    ),
                                    label: 'UNIv3 Pool',
                                    tooltip: 'Hello world',
                                }}
                                unbordered
                            /> */}
                            <Stat
                                stat={{
                                    header: (
                                        <ComingSoon $justify="flex-start" $fontSize="1.2rem">
                                            --
                                        </ComingSoon>
                                    ),
                                    label: 'Depth to Equilibrium',
                                    tooltip: `Amount of HAI required to be bought (positive) or sold (negative) for the Market Price to approximately equal the Redemption Price. This is an estimate based on the tracked liquidity pools and their current locked liquidity.`,
                                }}
                                unbordered
                            />
                        </Flex>
                        <ToggleSlider
                            selectedIndex={convertPieToUSD ? 1 : 0}
                            setSelectedIndex={(index: number) => setConvertPieToUSD(!!index)}
                        >
                            <TimeframeLabel>HAI</TimeframeLabel>
                            <TimeframeLabel>USD</TimeframeLabel>
                        </ToggleSlider>
                    </Flex>
                    <PieContainer>
                        <PieChart
                            data={dummyPieData}
                            valueFormat={
                                convertPieToUSD
                                    ? (value) => {
                                          return formatNumberWithStyle(value * parseFloat(redemptionPrice.raw), {
                                              maxDecimals: 2,
                                              style: 'currency',
                                          })
                                      }
                                    : (value) => {
                                          return `${formatNumberWithStyle(value, { maxDecimals: 0 })} HAI`
                                      }
                            }
                        />
                        <Legend $column data={dummyPieData} style={{ top: 'calc(50% - 96px)' }} />
                    </PieContainer>
                </SectionContent>
            </Section>
            <Section>
                <SectionHeader>PROTOCOL BALANCE</SectionHeader>
                <Stats>
                    <Stat
                        stat={{
                            header: `${graphSummary?.systemSurplus.formatted || '--'} HAI`,
                            label: 'System Surplus Buffer',
                            tooltip: `Total surplus accrued in the protocol's balance sheet. This is used to cover potential bad debt and for surplus auctions.`,
                        }}
                    />
                    <Stat
                        stat={{
                            header: `${surplusInTreasury.formatted} HAI`,
                            label: 'Keeper Treasury',
                            tooltip: `Amount of HAI accumulated for use in remunerating keepers that play key roles in the protocol (e.g. updating oracles, update redemption rate, cleaning up state).`,
                        }}
                    />
                    <Stat
                        stat={{
                            header: `${graphSummary?.debtAvailableToSettle.formatted || '--'} HAI`,
                            label: 'Debt to Settle',
                            tooltip: `Pending amount of debt in the protocol's balance sheet which still needs to be settled using surplus that comes from collateral auctions and/or accrued stability fees`,
                        }}
                    />
                </Stats>
            </Section>
        </Container>
    )
}

const Container = styled(BlurContainer).attrs((props) => ({
    $width: '100%',
    $gap: 24,
    ...props,
}))`
    padding: 48px;
    & > * {
        padding: 0px;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
    `}
`

const Section = styled.section.attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 24,
    ...props,
}))<FlexProps>`
    ${FlexStyle}
`

const SectionHeader = styled(Text).attrs((props) => ({
    $fontSize: '1.4rem',
    $fontWeight: 700,
    ...props,
}))``

const SectionContent = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 24,
    $borderOpacity: 0.2,
    ...props,
}))<DashedContainerProps>`
    ${DashedContainerStyle}
    padding: 24px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        gap: 12px;
    `}
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

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        height: 240px;
    `}
`

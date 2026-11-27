import { useMemo, useState } from 'react'
import { formatEther, formatUnits } from 'ethers/lib/utils'

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
import { PriceDisplay } from './PriceDisplay'
import { PieChart } from '~/components/Charts/Pie'
import { Legend } from '~/components/Charts/Legend'
import { BlockBanner } from '~/components/BlockBanner'

const colors = [
    'hsl(49, 84%, 68%)', // yellowish
    'hsl(115, 70%, 84%)', // greenish
    'hsl(313, 100%, 88%)', // pinkish
    'hsl(232, 64%, 84%)', // blueish
    'hsl(16, 100%, 84%)', // orangeish
    'hsl(0, 100%, 74%)', // reddish
]

export function Numbers() {
    const {
        data: { erc20Supply, redemptionPrice, annualRate, pRate, iRate, surplusInTreasury },
        graphSummary,
        haiPriceHistory,
        redemptionRateHistory,
        pools,
        haiMarketPrice,
    } = useAnalytics()

    const [haiPriceData, haiPriceMin, haiPriceMax] = useMemo(() => {
        const data = haiPriceHistory.data?.dailyStats || haiPriceHistory.data?.hourlyStats || []
        const minAndMax = { min: Infinity, max: 0 }
        const priceData = [
            {
                id: 'Market Price',
                color: 'hsl(49, 84%, 68%)',
                data: data.map(({ timestamp, marketPriceUsd }) => {
                    const val = parseFloat(marketPriceUsd)
                    if (val < minAndMax.min) minAndMax.min = val
                    if (val > minAndMax.max) minAndMax.max = val
                    return {
                        x: new Date(Number(timestamp) * 1000),
                        y: val,
                    }
                }),
            },
            {
                id: 'Redemption Price',
                color: 'hsl(115, 70%, 84%)',
                data: data.map(({ timestamp, redemptionPrice }) => {
                    const val = parseFloat(redemptionPrice.value)
                    if (val < minAndMax.min) minAndMax.min = val
                    if (val > minAndMax.max) minAndMax.max = val
                    return {
                        x: new Date(Number(timestamp) * 1000),
                        y: val,
                    }
                }),
            },
        ]
        return [priceData, minAndMax.min, minAndMax.max]
    }, [haiPriceHistory])

    const redemptionRateData = useMemo(() => {
        const data = redemptionRateHistory.data?.dailyStats || redemptionRateHistory.data?.hourlyStats || []
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

    const isUpToSmall = useMediaQuery('upToSmall')

    const [poolPieData, totalHaiInPools] = useMemo(() => {
        let total = 0
        const data: { id: string; color: string; value: number }[] = []
        let colorIndex = 0

        const uniLabel = isUpToSmall ? 'UniV3' : 'Uniswap V3 Pool'
        for (const pool of pools.uniPools) {
            const indexOfToken = pool.inputTokens.findIndex(({ symbol }) => symbol === 'HAI')
            if (indexOfToken < 0) continue // sanity check
            const hai = parseFloat(formatEther(pool.inputTokenBalances[indexOfToken]))
            total += hai
            data.push({
                id: `${uniLabel} - ${pool.inputTokens[0].symbol}/${pool.inputTokens[1].symbol} (${pool.name.slice(
                    pool.name.lastIndexOf(' ') + 1,
                    pool.name.length
                )})`,
                color: colors[colorIndex % colors.length],
                value: hai,
            })
            colorIndex++
        }

        const veloLabel = isUpToSmall ? 'Velo' : 'Velodrome Pool'
        for (const pool of pools.veloPools) {
            if (!pool.tokenPair.includes('HAI')) continue
            const hai = parseFloat(
                formatUnits(pool.tokenPair[0] === 'HAI' ? pool.reserve0 : pool.reserve1, pool.decimals)
            )
            total += hai
            data.push({
                id: `${veloLabel} - ${pool.tokenPair.join('/')}`,
                color: colors[colorIndex % colors.length],
                value: hai,
            })
            colorIndex++
        }

        return [data, total]
    }, [pools.uniPools, pools.veloPools, isUpToSmall])

    return (
        <Container>
            <Section>
                <BrandedTitle textContent="HAI LEVEL NUMBERS" $fontSize="3rem" />
                <SectionHeader>IMPORTANT STUFF</SectionHeader>
                <Stats fun>
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
                    <SectionContentHeader>
                        <SectionInnerHeader>
                            <PriceDisplay
                                token="HAI"
                                price={haiMarketPrice.formatted}
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
                        </SectionInnerHeader>
                        <ToggleSlider
                            selectedIndex={haiPriceHistory.timeframe}
                            setSelectedIndex={haiPriceHistory.setTimeframe}
                        >
                            <TimeframeLabel>24HR</TimeframeLabel>
                            <TimeframeLabel>1WK</TimeframeLabel>
                            <TimeframeLabel>1M</TimeframeLabel>
                            {/* <TimeframeLabel>1YR</TimeframeLabel> */}
                        </ToggleSlider>
                    </SectionContentHeader>
                    <ChartContainer>
                        <LineChart
                            data={haiPriceData}
                            timeframe={haiPriceHistory.timeframe}
                            yScale={{
                                type: 'linear',
                                min: Math.floor(10 * haiPriceMin) / 10,
                                max: Math.ceil(10 * haiPriceMax) / 10,
                            }}
                            formatY={(value: string | number) =>
                                formatNumberWithStyle(value, {
                                    minDecimals: 4,
                                    maxDecimals: 4,
                                    minSigFigs: 2,
                                    maxSigFigs: 4,
                                    style: 'currency',
                                })
                            }
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
                    <SectionContentHeader>
                        <SectionInnerHeader>
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
                            <CenteredFlex $gap={isUpToSmall ? 12 : 36}>
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
                        </SectionInnerHeader>
                        <ToggleSlider
                            selectedIndex={redemptionRateHistory.timeframe}
                            setSelectedIndex={redemptionRateHistory.setTimeframe}
                        >
                            <TimeframeLabel>24HR</TimeframeLabel>
                            <TimeframeLabel>1WK</TimeframeLabel>
                            <TimeframeLabel>1M</TimeframeLabel>
                            {/* <TimeframeLabel>1YR</TimeframeLabel> */}
                        </ToggleSlider>
                    </SectionContentHeader>
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
                    <SectionContentHeader>
                        <SectionInnerHeader>
                            <Stat
                                stat={{
                                    header: convertPieToUSD
                                        ? formatNumberWithStyle(totalHaiInPools * parseFloat(redemptionPrice.raw), {
                                              maxDecimals: 0,
                                              style: 'currency',
                                          })
                                        : formatNumberWithStyle(totalHaiInPools, { maxDecimals: 0 }),
                                    label: 'HAI in Liquidity Pools',
                                    tooltip: `Amount of HAI locked in tracked liquidity pools`,
                                }}
                                unbordered
                            />
                            <Stat
                                stat={{
                                    header: (
                                        <BlockBanner text="COMING SOON" $justify="flex-start" $fontSize="1.2rem">
                                            --
                                        </BlockBanner>
                                    ),
                                    label: 'Depth to Equilibrium',
                                    tooltip: `Amount of HAI required to be bought (positive) or sold (negative) for the Market Price to approximately equal the Redemption Price. This is an estimate based on the tracked liquidity pools and their current locked liquidity.`,
                                }}
                                unbordered
                            />
                        </SectionInnerHeader>
                        <ToggleSlider
                            selectedIndex={convertPieToUSD ? 1 : 0}
                            setSelectedIndex={(index: number) => setConvertPieToUSD(!!index)}
                        >
                            <TimeframeLabel>HAI</TimeframeLabel>
                            <TimeframeLabel>USD</TimeframeLabel>
                        </ToggleSlider>
                    </SectionContentHeader>
                    <PieContainer>
                        <PieChart
                            data={poolPieData}
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
                        <Legend $column data={poolPieData} style={{ top: 'calc(50% - 96px)' }} />
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
const SectionContentHeader = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props,
}))`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        align-items: flex-start;
    `}
`
const SectionInnerHeader = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    $gap: 36,
    ...props,
}))`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        align-items: flex-start;
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

    z-index: 2;
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

    z-index: 2;
`

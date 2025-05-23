import { useMemo, useState } from 'react'
import { formatNumberWithStyle } from '~/utils'
import { useAnalytics } from '~/providers/AnalyticsProvider'

import styled from 'styled-components'
import { BlurContainer, CenteredFlex, Flex, Grid, Text, type FlexProps, FlexStyle } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { Stat, Stats } from '~/components/Stats'
import { LineChart } from '~/components/Charts/Line'
import { Legend } from '~/components/Charts/Legend'
import { HaiButton } from '~/styles'

import { Slider } from '~/components/Slider'

//import { Slider } from '~/components/Slider'

export function HaiPerformance() {
    const { haiPricePerformance, haiMarketPrice } = useAnalytics()
    const { day30, day60, day90, priceHistory } = haiPricePerformance

    // Calculator state
    const [calculatorAmount, setCalculatorAmount] = useState<string>('1000')
    const [calculatorDays, setCalculatorDays] = useState<number>(30)

    // Chart data and bounds
    const [chartData, yMin, yMax] = useMemo(() => {
        if (!priceHistory.length) return [[], 0, 1]

        // Filter valid prices and find min/max
        const validPrices = priceHistory.filter(({ price }) => price > 0)
        const prices = validPrices.map(({ price }) => price)
        const min = Math.min(...prices)
        const max = Math.max(...prices)

        // Add some padding to the bounds (10%)
        const padding = (max - min) * 0.1
        const yMin = Math.max(0, Math.floor((min - padding) * 100) / 100)
        const yMax = Math.ceil((max + padding) * 100) / 100

        return [
            [
                {
                    id: 'HAI Price (USD)',
                    color: 'hsl(49, 84%, 68%)',
                    data: validPrices.map(({ timestamp, price }) => ({
                        x: new Date(timestamp * 1000),
                        y: price,
                    })),
                },
            ],
            yMin,
            yMax,
        ]
    }, [priceHistory])

    // Calculate value if purchased X days ago
    const calculatorResults = useMemo(() => {
        if (!priceHistory.length || !calculatorAmount) return { gain: 0, percent: 0, initialValue: 0, currentValue: 0 }

        const amount = parseFloat(calculatorAmount) || 0
        const now = Math.floor(Date.now() / 1000)
        const targetDate = now - calculatorDays * 24 * 60 * 60

        // Use the same price finding logic as in the trends
        const validPrices = priceHistory.filter(({ price }) => price > 0)
        const historicalPrice = validPrices.reduce((prev, curr) => {
            return Math.abs(curr.timestamp - targetDate) < Math.abs(prev.timestamp - targetDate) ? curr : prev
        }, validPrices[0]).price

        const currentPrice = validPrices[validPrices.length - 1]?.price || parseFloat(haiMarketPrice.raw || '0')

        // Calculate gain
        const initialValue = historicalPrice * amount
        const currentValue = currentPrice * amount
        const gain = currentValue - initialValue
        const percentChange = initialValue ? ((currentValue - initialValue) / initialValue) * 100 : 0

        return { gain, percent: percentChange, initialValue, currentValue }
    }, [priceHistory, calculatorAmount, calculatorDays, haiMarketPrice])

    return (
        <Container id="hai-performance">
            <Section>
                <BrandedTitle textContent="HAI PERFORMANCE" $fontSize="3rem" />
                <SectionHeader>PRICE TRENDS</SectionHeader>
                <Stats fun>
                    <Stat
                        stat={{
                            header: formatNumberWithStyle(day30, {
                                maxDecimals: 2,
                                style: 'percent',
                                scalingFactor: 0.01,
                            }),
                            label: '30 Day Change',
                            tooltip: `HAI price change over the last 30 days`,
                        }}
                    />
                    <Stat
                        stat={{
                            header: formatNumberWithStyle(day60, {
                                maxDecimals: 2,
                                style: 'percent',
                                scalingFactor: 0.01,
                            }),
                            label: '60 Day Change',
                            tooltip: `HAI price change over the last 60 days`,
                        }}
                    />
                    <Stat
                        stat={{
                            header: formatNumberWithStyle(day90, {
                                maxDecimals: 2,
                                style: 'percent',
                                scalingFactor: 0.01,
                            }),
                            label: '90 Day Change',
                            tooltip: `HAI price change over the last 90 days`,
                        }}
                    />
                </Stats>
            </Section>

            <Section>
                <SectionHeader>VALUE CALCULATOR</SectionHeader>
                <CalculatorContainer>
                    <CalculatorInputs>
                        <FormGroup>
                            <FormLabel>HAI Amount</FormLabel>
                            <Input
                                type="number"
                                value={calculatorAmount}
                                onChange={(e) => setCalculatorAmount(e.target.value)}
                                placeholder="Enter HAI amount"
                            />
                        </FormGroup>

                        <FormGroup>
                            <FormLabel>Time Period: {calculatorDays} days ago</FormLabel>
                            <Slider min={7} max={90} step={1} value={calculatorDays} onChange={setCalculatorDays} />
                        </FormGroup>
                        <div style={{ maxWidth: '100px' }}>
                            <HaiButton $variant="yellowish" onClick={() => setCalculatorDays(30)}>
                                Reset
                            </HaiButton>
                        </div>
                    </CalculatorInputs>

                    <CalculatorResults>
                        <ResultItem>
                            <ResultLabel>Initial Value:</ResultLabel>
                            <ResultValue>
                                {formatNumberWithStyle(calculatorResults.initialValue, {
                                    style: 'currency',
                                    maxDecimals: 2,
                                })}
                            </ResultValue>
                        </ResultItem>
                        <ResultItem>
                            <ResultLabel>Current Value:</ResultLabel>
                            <ResultValue>
                                {formatNumberWithStyle(calculatorResults.currentValue, {
                                    style: 'currency',
                                    maxDecimals: 2,
                                })}
                            </ResultValue>
                        </ResultItem>
                        <ResultItem highlight>
                            <ResultLabel>Gain/Loss:</ResultLabel>
                            <ResultValue positive={calculatorResults.gain > 0}>
                                {formatNumberWithStyle(calculatorResults.gain, { style: 'currency', maxDecimals: 2 })}
                                &nbsp; (
                                {formatNumberWithStyle(calculatorResults.percent, {
                                    style: 'percent',
                                    scalingFactor: 0.01,
                                    maxDecimals: 2,
                                })}
                                )
                            </ResultValue>
                        </ResultItem>
                    </CalculatorResults>
                </CalculatorContainer>
            </Section>

            <Section>
                <SectionHeader>HAI PRICE CHART</SectionHeader>
                <ChartContainer>
                    <LineChart
                        data={chartData}
                        timeframe={0}
                        yScale={{
                            type: 'linear',
                            min: yMin,
                            max: yMax,
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
                    <Legend data={chartData} />
                </ChartContainer>
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
    scroll-margin-top: 150px;
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

const CalculatorContainer = styled(Grid)`
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding: 24px;
    background-color: ${({ theme }) => theme.colors.background};
    border-radius: 24px;
    border: ${({ theme }) => theme.border.medium};

    ${({ theme }) => theme.mediaWidth.upToMedium`
        grid-template-columns: 1fr;
    `}
`

const CalculatorInputs = styled(Flex).attrs((props) => ({
    $column: true,
    $gap: 24,
    ...props,
}))`
    width: 100%;
`

const CalculatorResults = styled(Flex).attrs((props) => ({
    $column: true,
    $gap: 12,
    ...props,
}))`
    width: 100%;
    padding: 24px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 12px;
    border: ${({ theme }) => theme.border.medium};
`

const FormGroup = styled(Flex).attrs((props) => ({
    $column: true,
    $gap: 12,
    ...props,
}))`
    width: 100%;
    margin-bottom: 12px;
`

const FormLabel = styled(Text).attrs((props) => ({
    $fontWeight: 700,
    ...props,
}))`
    font-size: 1rem;
`

const Input = styled.input`
    width: 100%;
    padding: 12px 16px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    font-size: 1rem;
    background: white;

    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.primary};
    }
`

const ResultItem = styled(Flex).attrs((props) => ({
    $justify: 'space-between',
    $align: 'center',
    ...props,
}))<{ highlight?: boolean }>`
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    background: ${({ highlight, theme }) => (highlight ? theme.colors.yellowish + '44' : 'transparent')};
`

const ResultLabel = styled(Text).attrs((props) => ({
    $fontWeight: 700,
    ...props,
}))`
    font-size: 1rem;
`

const ResultValue = styled(Text).attrs((props) => ({
    $fontWeight: 700,
    ...props,
}))<{ positive?: boolean }>`
    font-size: 1rem;
    color: ${({ positive, theme }) =>
        positive === undefined ? 'inherit' : positive ? theme.colors.successColor : theme.colors.dangerColor};
`

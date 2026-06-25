import { useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'

import { Status, formatNumberWithStyle } from '~/utils'

import styled from 'styled-components'
import {
    type DashedContainerProps,
    DashedContainerStyle,
    BlurContainer,
    CenteredFlex,
    Flex,
    Grid,
    HaiButton,
    Text,
} from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { BrandedSelect, type BrandedSelectOption } from '~/components/BrandedSelect'
import { Link } from '~/components/Link'
import { Stats, type StatProps } from '~/components/Stats'
import { NavContainer } from '~/components/NavContainer'
import { StatusLabel } from '~/components/StatusLabel'
import { Swirl } from '~/components/Icons/Swirl'
import { TokenArray } from '~/components/TokenArray'
import { Tooltip } from '~/components/Tooltip'
import { NumberInput } from '~/components/NumberInput'
import { CheckBox } from '~/components/CheckBox'

const marketPrice = 1.2699
const redemptionPrice = 1.3099
const depositApr = 24.69
const currentPegError = 2.69
const SHAI_DOCS_LINK = 'https://docs.letsgethai.com/stability-pool'
const pegPosition = Math.min(100, Math.max(0, ((currentPegError + 10) / 20) * 100))
const gaugeFillStart = currentPegError >= 0 ? 50 : pegPosition
const gaugeFillEnd = currentPegError >= 0 ? pegPosition : 50

type ChartRange = '30d' | '90d' | '1y' | 'max'

const chartRanges: { label: string; value: ChartRange }[] = [
    { label: 'Max', value: 'max' },
    { label: '1y', value: '1y' },
    { label: '90d', value: '90d' },
    { label: '30d', value: '30d' },
]

// TODO(sHAI integration): remove this dummy data factory and wire the chart to protocol APR / peg error history.
// The placeholder data is intentionally inverse-correlated: when peg error is positive, APR drops; when peg error
// is negative, APR rises. All ranges end at the current scaffold values above.
const DUMMY_SHAI_CHART_SERIES: Record<ChartRange, { days: number; pegErrors: number[] }> = {
    '30d': {
        days: 30,
        pegErrors: [-4.8, -4.1, -2.9, -1.6, -0.2, 1.1, 2.8, 4.2, 3.5, currentPegError],
    },
    '90d': {
        days: 90,
        pegErrors: [-6.2, -5.4, -3.1, -0.8, 1.9, 4.7, 6.1, 3.6, 0.9, -2.7, -1.1, currentPegError],
    },
    '1y': {
        days: 365,
        pegErrors: [-7.2, -4.8, -2.1, 1.4, 5.9, 7.1, 3.8, 0.6, -3.9, -6.4, -1.8, currentPegError],
    },
    max: {
        days: 720,
        pegErrors: [-8.4, -6.8, -3.6, 2.4, 7.8, 5.1, 1.2, -4.7, -7.1, -2.5, 4.8, currentPegError],
    },
}

function buildDummySHaiChartData(range: ChartRange): ChartPoint[] {
    const { days, pegErrors } = DUMMY_SHAI_CHART_SERIES[range]
    const end = new Date('2026-06-25T00:00:00Z').getTime()
    const step = days / Math.max(pegErrors.length - 1, 1)

    return pegErrors.map((pegError, index) => {
        const progress = index / Math.max(pegErrors.length - 1, 1)
        const date = new Date(end - (days - step * index) * 24 * 60 * 60 * 1000)
        const inversePegApr = 31.2 - pegError * 1.55
        const curveNoise = Math.sin(progress * Math.PI * 3) * 1.15 + Math.cos(progress * Math.PI * 2) * 0.55

        return {
            date,
            pegError,
            apr: index === pegErrors.length - 1 ? depositApr : Math.max(16, Math.min(44, inversePegApr + curveNoise)),
        }
    })
}

const heroOptions: BrandedSelectOption[] = [
    {
        label: 'Get HAI',
        value: 'vaults',
        icon: ['HAI'],
        description: 'Mint and borrow HAI against your preferred collateral',
    },
    {
        label: 'GET sHAI',
        value: 'sHAI',
        icon: ['HAI'],
        description: 'Deposit HAI into the stability pool to mint sHAI',
    },
    {
        label: 'Get haiVELO',
        value: 'haiVELO',
        icon: ['HAIVELOV2'],
        description: 'Convert VELO into haiVELO and mint against it',
    },
    {
        label: 'Get haiAERO',
        value: 'haiAERO',
        icon: ['HAIAERO'],
        description: 'Convert AERO into haiAERO on Base and bridge to Optimism',
    },
    {
        label: 'Earn Rewards',
        value: 'earn',
        icon: ['HAI', 'OP'],
        description: 'Participate in DAO incentive campaigns to earn rewards',
    },
    {
        label: 'STAKE KITE',
        value: 'stake',
        icon: ['KITE'],
        description: 'Stake KITE to earn protocol revenue and boost incentives',
    },
]

export function SHaiPage() {
    const history = useHistory()
    const [tab, setTab] = useState(0)
    const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit')
    const [chartRange, setChartRange] = useState<ChartRange>('90d')
    const [depositAmount, setDepositAmount] = useState('')
    const [withdrawAmount, setWithdrawAmount] = useState('')

    const selectDepositMode = () => {
        setMode('deposit')
        setWithdrawAmount('')
    }

    const selectWithdrawMode = () => {
        setMode('withdraw')
        setDepositAmount('')
    }

    const activeAmount = mode === 'deposit' ? depositAmount : withdrawAmount
    const activeAmountNumber = Number(activeAmount || 0)
    const activeConversion =
        activeAmountNumber > 0
            ? `~${formatNumberWithStyle(activeAmountNumber * marketPrice, {
                  style: 'currency',
                  minDecimals: 2,
                  maxDecimals: 2,
              })}`
            : ''
    const pegGaugeAction = currentPegError > 0 ? 'Withdraw & sell' : currentPegError < 0 ? 'Buy & deposit' : 'At peg'

    const selectedChartData = useMemo(() => buildDummySHaiChartData(chartRange), [chartRange])

    const heroStats: StatProps[] = useMemo(
        () => [
            {
                header: '$369.42k',
                label: 'HAI Deposit TVL',
                tooltip: 'Total USD value of HAI deposited into the sHAI stability pool.',
            },
            {
                header: '42.69%',
                label: 'HAI Supply Deposited',
                tooltip: 'Share of circulating HAI currently deposited into the sHAI pool.',
            },
            {
                header: '39.69%',
                label: 'HAI Deposit APR',
                tooltip: 'Estimated annualized return for depositing HAI.',
            },
            {
                header: '$420.69',
                label: 'My sHAI Rewards',
                tooltip: 'Claimable rewards from your sHAI position.',
                button: (
                    <HaiButton $variant="yellowish" onClick={() => undefined}>
                        Claim
                    </HaiButton>
                ),
            },
        ],
        []
    )

    return (
        <>
            <Hero>
                <HeroInner>
                    <HeroCopy>
                        <Flex $justify="flex-start" $align="center" $gap={12} $flexWrap>
                            <BrandedTitle textContent="I WANT TO" $fontSize="3.2em" />
                            <BrandedSelect
                                value="sHAI"
                                onChange={(value: string) => history.push(`/${value}`)}
                                options={heroOptions}
                                uppercase={false}
                                $fontSize="3.2em"
                                aria-label="Action"
                            />
                        </Flex>
                        <Text>
                            Deposit your HAI into the stability pool to earn rewards for participating in protocol
                            stability.{' '}
                            <Link href={SHAI_DOCS_LINK} $fontWeight={700}>
                                Read more about sHAI -&gt;
                            </Link>
                        </Text>
                    </HeroCopy>
                    <Stats stats={heroStats} columns="repeat(4, 1fr)" />
                </HeroInner>
            </Hero>

            <NavContainer
                navItems={['Manage sHAI', 'Activity']}
                selected={tab}
                onSelect={setTab}
                compactQuery="upToMedium"
            >
                {tab === 0 ? (
                    <BodyGrid>
                        <OverviewColumn>
                            <SectionHeader>
                                <Flex $justify="flex-start" $align="center" $gap={12} $flexWrap>
                                    <Text $fontWeight={700}>sHAI Overview</Text>
                                    <StatusLabel status={Status.CUSTOM} background="gradient">
                                        <CenteredFlex $gap={8}>
                                            <Swirl size={14} />
                                            <Text $fontSize="0.67rem" $fontWeight={700}>
                                                Simulation
                                            </Text>
                                        </CenteredFlex>
                                    </StatusLabel>
                                </Flex>
                            </SectionHeader>

                            <OverviewGrid $borderOpacity={0.2}>
                                <MetricCell $span={3}>
                                    <MetricHeader>
                                        <TokenArray tokens={['HAI']} size={42} hideLabel />
                                        <MetricStack>
                                            <Text $fontSize="0.8em">Total HAI Deposited</Text>
                                            <Text $fontSize="1.5em" $fontWeight={700}>
                                                6.9k HAI
                                            </Text>
                                            <Text $fontSize="1.05em" $color="rgba(0,0,0,0.6)">
                                                $4,206.90
                                            </Text>
                                        </MetricStack>
                                    </MetricHeader>
                                    <StatusLabel status={Status.CUSTOM} background="gradient">
                                        <Text $fontSize="0.67rem" $fontWeight={700}>
                                            4,200 HAI After Tx
                                        </Text>
                                    </StatusLabel>
                                </MetricCell>

                                <MetricCell $span={3}>
                                    <MetricHeader>
                                        <TokenArray tokens={['HAI']} size={42} hideLabel />
                                        <MetricStack>
                                            <Text $fontSize="0.8em">My HAI Deposited</Text>
                                            <Text $fontSize="1.5em" $fontWeight={700}>
                                                2.3k HAI
                                            </Text>
                                            <Text $fontSize="1.05em" $color="rgba(0,0,0,0.6)">
                                                $4,206.90
                                            </Text>
                                        </MetricStack>
                                    </MetricHeader>
                                    <StatusLabel status={Status.CUSTOM} background="gradient">
                                        <Text $fontSize="0.67rem" $fontWeight={700}>
                                            4,500 HAI After Tx
                                        </Text>
                                    </StatusLabel>
                                </MetricCell>

                                <MetricCell $span={2}>
                                    <MetricStack>
                                        <MetricValue>
                                            {formatNumberWithStyle(marketPrice, {
                                                style: 'currency',
                                                minDecimals: 4,
                                                maxDecimals: 4,
                                            })}
                                        </MetricValue>
                                        <MetricLabel>
                                            HAI Market Price
                                            <Tooltip width="200px">Current market reference price for HAI.</Tooltip>
                                        </MetricLabel>
                                    </MetricStack>
                                </MetricCell>

                                <MetricCell $span={2}>
                                    <MetricStack>
                                        <MetricValue>
                                            {formatNumberWithStyle(redemptionPrice, {
                                                style: 'currency',
                                                minDecimals: 4,
                                                maxDecimals: 4,
                                            })}
                                        </MetricValue>
                                        <MetricLabel>
                                            HAI Redemption Price
                                            <Tooltip width="200px">
                                                Protocol redemption price used to measure peg error.
                                            </Tooltip>
                                        </MetricLabel>
                                    </MetricStack>
                                </MetricCell>

                                <MetricCell $span={2}>
                                    <MetricStack>
                                        <MetricValue>{depositApr.toFixed(2)}%</MetricValue>
                                        <MetricLabel>
                                            HAI Deposit APR
                                            <Tooltip width="200px">
                                                Estimated annualized return from depositing HAI.
                                            </Tooltip>
                                        </MetricLabel>
                                    </MetricStack>
                                </MetricCell>

                                <ChartCell $full>
                                    <ChartHeader>
                                        <MetricLabel>
                                            HAI Peg Gauge: <strong>{pegGaugeAction}</strong>
                                            <Tooltip width="220px">
                                                APR and peg error are shown together to frame the sHAI deposit signal.
                                            </Tooltip>
                                        </MetricLabel>
                                        <RangeSelector aria-label="Chart range">
                                            {chartRanges.map(({ label, value }) => (
                                                <RangeButton
                                                    key={value}
                                                    type="button"
                                                    $active={chartRange === value}
                                                    onClick={() => setChartRange(value)}
                                                    aria-pressed={chartRange === value}
                                                >
                                                    {label}
                                                </RangeButton>
                                            ))}
                                        </RangeSelector>
                                    </ChartHeader>
                                    <ChartFrame>
                                        <DualAxisChart data={selectedChartData} range={chartRange} />
                                    </ChartFrame>
                                </ChartCell>

                                <GaugeCell $full>
                                    <GaugeTopLabels>
                                        <Text>Buy &amp; deposit HAI</Text>
                                        <Text $textAlign="right">Withdraw &amp; sell HAI</Text>
                                    </GaugeTopLabels>
                                    <GaugeTrack aria-label="Current peg error gauge">
                                        <GaugeFill
                                            $start={gaugeFillStart}
                                            $end={gaugeFillEnd}
                                            $direction={currentPegError >= 0 ? 'right' : 'left'}
                                        />
                                        <GaugeCenter />
                                        <GaugeMarker $position={pegPosition} />
                                    </GaugeTrack>
                                    <GaugeScale>
                                        <Text>-10%</Text>
                                        <Text>&lt;- Peg -&gt;</Text>
                                        <Text>+10%</Text>
                                    </GaugeScale>
                                    <GaugeContext>
                                        <Text>Highest yield</Text>
                                        <Text $fontWeight={700}>Current error: {currentPegError.toFixed(2)}%</Text>
                                        <Text $textAlign="right">Lowest yield</Text>
                                    </GaugeContext>
                                </GaugeCell>
                            </OverviewGrid>
                        </OverviewColumn>

                        <ActionPanel>
                            <ActionHeader>
                                <Text $fontWeight={700}>Manage HAI Deposit</Text>
                            </ActionHeader>
                            <ActionBody>
                                <NumberInput
                                    label={
                                        <CenteredFlex $gap={8}>
                                            <CheckBox checked={mode === 'deposit'} size={14} />
                                            <Text>Deposit</Text>
                                        </CenteredFlex>
                                    }
                                    subLabel="Max 69.42k HAI"
                                    placeholder="Deposit Amount"
                                    unitLabel="HAI"
                                    value={depositAmount}
                                    onFocus={selectDepositMode}
                                    onClick={selectDepositMode}
                                    onChange={(value: string) => {
                                        selectDepositMode()
                                        setDepositAmount(value)
                                    }}
                                    onMax={() => {
                                        selectDepositMode()
                                        setDepositAmount('69420.69')
                                    }}
                                    conversion={mode === 'deposit' ? activeConversion : ''}
                                    style={mode === 'deposit' ? undefined : { opacity: 0.5 }}
                                />
                                <NumberInput
                                    label={
                                        <CenteredFlex $gap={8}>
                                            <CheckBox checked={mode === 'withdraw'} size={14} />
                                            <Text>Withdraw</Text>
                                        </CenteredFlex>
                                    }
                                    subLabel="Max 2.30k HAI"
                                    placeholder="Withdraw Amount"
                                    unitLabel="HAI"
                                    value={withdrawAmount}
                                    onFocus={selectWithdrawMode}
                                    onClick={selectWithdrawMode}
                                    onChange={(value: string) => {
                                        selectWithdrawMode()
                                        setWithdrawAmount(value)
                                    }}
                                    onMax={() => {
                                        selectWithdrawMode()
                                        setWithdrawAmount('2300')
                                    }}
                                    conversion={mode === 'withdraw' ? activeConversion : ''}
                                    style={mode === 'withdraw' ? undefined : { opacity: 0.5 }}
                                />
                                <ActionCopy>
                                    Use the chart and gauge as indicators for how to directly participate in protocol
                                    stability.
                                </ActionCopy>
                                <ActionCopy>
                                    Deposits earn dynamic KITE emissions based on peg error and automatically compound a
                                    portion of HAI protocol fees and liquidation auction profits.
                                </ActionCopy>
                            </ActionBody>
                            <ActionFooter>
                                <HaiButton
                                    $variant="yellowish"
                                    $width="100%"
                                    $justify="center"
                                    disabled={activeAmountNumber <= 0}
                                    onClick={() => undefined}
                                >
                                    {mode === 'deposit' ? 'Deposit HAI' : 'Withdraw HAI'}
                                </HaiButton>
                            </ActionFooter>
                        </ActionPanel>
                    </BodyGrid>
                ) : (
                    <ActivityPanel>
                        <ActivityHeader>
                            <Text $fontWeight={700}>sHAI Activity</Text>
                            <Text $fontSize="0.85em" $color="rgba(0,0,0,0.6)">
                                Deposits, withdrawals, rewards, and claims will appear here.
                            </Text>
                        </ActivityHeader>
                        <ActivityTable>
                            <ActivityRow $header>
                                <Text>Action</Text>
                                <Text>Amount</Text>
                                <Text>Status</Text>
                                <Text $textAlign="right">Time</Text>
                            </ActivityRow>
                            <EmptyActivity>No sHAI activity yet.</EmptyActivity>
                        </ActivityTable>
                    </ActivityPanel>
                )}
            </NavContainer>
        </>
    )
}

type ChartPoint = {
    date: Date
    apr: number
    pegError: number
}

type ChartScale = {
    min: number
    max: number
}

function DualAxisChart({ data, range }: { data: ChartPoint[]; range: ChartRange }) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
    const width = 760
    const height = 360
    const padding = {
        top: 48,
        right: 76,
        bottom: 56,
        left: 76,
    }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom
    const aprScale: ChartScale = { min: 15, max: 45 }
    const pegScale: ChartScale = { min: -10, max: 10 }
    const aprTicks = [15, 22.5, 30, 37.5, 45]
    const pegTicks = [-10, -5, 0, 5, 10]
    const xTickCount = range === '30d' ? 5 : 7
    const xTicks = Array.from(
        new Set(Array.from({ length: xTickCount }, (_, i) => Math.round((i * (data.length - 1)) / (xTickCount - 1))))
    )
    const formatDate = (date: Date) =>
        date.toLocaleDateString('en-US', {
            month: 'short',
            day: range === '30d' || range === '90d' ? 'numeric' : undefined,
            year: range === '1y' || range === 'max' ? '2-digit' : undefined,
        })

    const xForIndex = (index: number) => padding.left + (index / Math.max(data.length - 1, 1)) * plotWidth
    const yForValue = (value: number, scale: ChartScale) =>
        padding.top + ((scale.max - value) / (scale.max - scale.min)) * plotHeight
    const pointFor = (point: ChartPoint, index: number, key: 'apr' | 'pegError') => ({
        x: xForIndex(index),
        y: yForValue(point[key], key === 'apr' ? aprScale : pegScale),
    })
    const buildPath = (key: 'apr' | 'pegError') =>
        data
            .map((point, index) => {
                const { x, y } = pointFor(point, index, key)
                return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
            })
            .join(' ')

    const aprPath = buildPath('apr')
    const pegPath = buildPath('pegError')
    const lastApr = pointFor(data[data.length - 1], data.length - 1, 'apr')
    const lastPeg = pointFor(data[data.length - 1], data.length - 1, 'pegError')
    const latestPoint = data[data.length - 1]
    const pegZeroY = yForValue(0, pegScale)
    const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : undefined
    const hoveredX = hoveredIndex !== null ? xForIndex(hoveredIndex) : 0
    const hoveredAprPoint =
        hoveredPoint && hoveredIndex !== null ? pointFor(hoveredPoint, hoveredIndex, 'apr') : undefined
    const hoveredPegPoint =
        hoveredPoint && hoveredIndex !== null ? pointFor(hoveredPoint, hoveredIndex, 'pegError') : undefined
    const tooltipWidth = 164
    const tooltipHeight = 92
    const tooltipX =
        hoveredX > padding.left + plotWidth - tooltipWidth - 20 ? hoveredX - tooltipWidth - 18 : hoveredX + 18
    const tooltipY = hoveredAprPoint
        ? Math.max(
              padding.top + 10,
              Math.min(hoveredAprPoint.y - tooltipHeight / 2, padding.top + plotHeight - tooltipHeight - 10)
          )
        : padding.top

    return (
        <ChartSvg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="APR and peg error history">
            <defs>
                <linearGradient id="aprLineGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#BBCFDE" />
                    <stop offset="100%" stopColor="#C0F3BB" />
                </linearGradient>
                <linearGradient id="pegLineGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#F2D86A" />
                    <stop offset="100%" stopColor="#FFC2AB" />
                </linearGradient>
            </defs>

            <ChartPanel x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} rx="10" />

            {aprTicks.map((tick, index) => {
                const y = padding.top + (1 - index / (aprTicks.length - 1)) * plotHeight
                return (
                    <g key={tick}>
                        <GridLine x1={padding.left} x2={padding.left + plotWidth} y1={y} y2={y} />
                        <AxisLabel x={padding.left - 16} y={y + 4} textAnchor="end">
                            {tick % 1 === 0 ? tick : tick.toFixed(1)}%
                        </AxisLabel>
                        <AxisLabel x={padding.left + plotWidth + 16} y={y + 4} textAnchor="start">
                            {pegTicks[index] > 0 ? '+' : ''}
                            {pegTicks[index]}%
                        </AxisLabel>
                    </g>
                )
            })}

            <ZeroLine x1={padding.left} x2={padding.left + plotWidth} y1={pegZeroY} y2={pegZeroY} />
            <PegLineLabel x={padding.left + plotWidth - 10} y={pegZeroY - 8} textAnchor="end">
                Peg
            </PegLineLabel>

            {xTicks.map((index) => {
                const point = data[index]
                if (!point) return null
                const x = xForIndex(index)
                return (
                    <g key={index}>
                        <XTick x1={x} x2={x} y1={padding.top + plotHeight} y2={padding.top + plotHeight + 6} />
                        <AxisLabel x={x} y={padding.top + plotHeight + 28} textAnchor="middle">
                            {formatDate(point.date)}
                        </AxisLabel>
                    </g>
                )
            })}

            <AxisTitle x={padding.left} y={24} textAnchor="start" $color="#627F95">
                APR
            </AxisTitle>
            <AxisTitle x={padding.left + plotWidth} y={24} textAnchor="end" $color="#B49A20">
                Peg Error
            </AxisTitle>

            <OutlinedPath d={aprPath} />
            <DataPath d={aprPath} stroke="url(#aprLineGradient)" />
            <OutlinedPath d={pegPath} />
            <DataPath d={pegPath} stroke="url(#pegLineGradient)" />

            {data.map((point, index) => {
                const aprPoint = pointFor(point, index, 'apr')
                const pegPoint = pointFor(point, index, 'pegError')
                return (
                    <g key={point.date.toISOString()}>
                        <DataPoint cx={aprPoint.x} cy={aprPoint.y} r="4.5" $fill="#BBCFDE">
                            <title>{`${formatDate(point.date)} APR ${point.apr.toFixed(2)}%`}</title>
                        </DataPoint>
                        <DataPoint cx={pegPoint.x} cy={pegPoint.y} r="4.5" $fill="#F2D86A">
                            <title>{`${formatDate(point.date)} Peg Error ${point.pegError.toFixed(2)}%`}</title>
                        </DataPoint>
                    </g>
                )
            })}

            <CurrentValue x={lastApr.x - 74} y={lastApr.y - 37} width="98" height="28" rx="14" $fill="#BBCFDE" />
            <CurrentValueLabel x={lastApr.x - 25} y={lastApr.y - 18} textAnchor="middle">
                {latestPoint.apr.toFixed(2)}%
            </CurrentValueLabel>
            <CurrentValue x={lastPeg.x - 24} y={lastPeg.y + 12} width="98" height="28" rx="14" $fill="#F2D86A" />
            <CurrentValueLabel x={lastPeg.x + 25} y={lastPeg.y + 31} textAnchor="middle">
                {latestPoint.pegError.toFixed(2)}%
            </CurrentValueLabel>

            {hoveredPoint && hoveredAprPoint && hoveredPegPoint && (
                <g pointerEvents="none">
                    <HoverGuide x1={hoveredX} x2={hoveredX} y1={padding.top} y2={padding.top + plotHeight} />
                    <HoverPoint cx={hoveredAprPoint.x} cy={hoveredAprPoint.y} r="7" $fill="#BBCFDE" />
                    <HoverPoint cx={hoveredPegPoint.x} cy={hoveredPegPoint.y} r="7" $fill="#F2D86A" />
                    <HoverTooltip x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="14" />
                    <HoverTooltipText x={tooltipX + 14} y={tooltipY + 24} $weight={800}>
                        {formatDate(hoveredPoint.date)}
                    </HoverTooltipText>
                    <TooltipSwatch cx={tooltipX + 18} cy={tooltipY + 48} r="5" $fill="#BBCFDE" />
                    <HoverTooltipText x={tooltipX + 32} y={tooltipY + 52}>
                        APR
                    </HoverTooltipText>
                    <HoverTooltipText x={tooltipX + tooltipWidth - 14} y={tooltipY + 52} textAnchor="end" $weight={800}>
                        {hoveredPoint.apr.toFixed(2)}%
                    </HoverTooltipText>
                    <TooltipSwatch cx={tooltipX + 18} cy={tooltipY + 72} r="5" $fill="#F2D86A" />
                    <HoverTooltipText x={tooltipX + 32} y={tooltipY + 76}>
                        Peg Error
                    </HoverTooltipText>
                    <HoverTooltipText x={tooltipX + tooltipWidth - 14} y={tooltipY + 76} textAnchor="end" $weight={800}>
                        {hoveredPoint.pegError > 0 ? '+' : ''}
                        {hoveredPoint.pegError.toFixed(2)}%
                    </HoverTooltipText>
                </g>
            )}

            {data.map((point, index) => {
                const x = xForIndex(index)
                const left = index === 0 ? padding.left : (xForIndex(index - 1) + x) / 2
                const right = index === data.length - 1 ? padding.left + plotWidth : (x + xForIndex(index + 1)) / 2

                return (
                    <HoverTarget
                        key={`hover-${point.date.toISOString()}`}
                        x={left}
                        y={padding.top}
                        width={right - left}
                        height={plotHeight}
                        tabIndex={0}
                        aria-label={`${formatDate(point.date)} APR ${point.apr.toFixed(2)}%, peg error ${
                            point.pegError > 0 ? '+' : ''
                        }${point.pegError.toFixed(2)}%`}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onFocus={() => setHoveredIndex(index)}
                        onBlur={() => setHoveredIndex(null)}
                    />
                )
            })}
        </ChartSvg>
    )
}

const ChartSvg = styled.svg`
    display: block;
    width: 100%;
    height: 100%;
    font-family: inherit;
`

const ChartPanel = styled.rect`
    fill: rgba(255, 255, 255, 0.45);
    stroke: rgba(0, 0, 0, 0.16);
`

const GridLine = styled.line`
    stroke: rgba(0, 0, 0, 0.12);
    stroke-width: 1;
`

const ZeroLine = styled.line`
    stroke: rgba(0, 0, 0, 0.35);
    stroke-width: 1.5;
    stroke-dasharray: 6 7;
`

const PegLineLabel = styled.text`
    fill: rgba(0, 0, 0, 0.62);
    font-size: 11px;
    font-weight: 800;
    paint-order: stroke;
    stroke: rgba(255, 255, 255, 0.85);
    stroke-width: 5px;
    stroke-linejoin: round;
`

const XTick = styled.line`
    stroke: rgba(0, 0, 0, 0.35);
    stroke-width: 1.5;
`

const AxisLabel = styled.text`
    fill: rgba(0, 0, 0, 0.62);
    font-size: 12px;
    font-weight: 600;
`

const AxisTitle = styled.text<{ $color: string }>`
    fill: ${({ $color }) => $color};
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0;
`

const OutlinedPath = styled.path`
    fill: none;
    stroke: black;
    stroke-width: 7;
    stroke-linecap: round;
    stroke-linejoin: round;
`

const DataPath = styled.path`
    fill: none;
    stroke-width: 4.5;
    stroke-linecap: round;
    stroke-linejoin: round;
`

const DataPoint = styled.circle<{ $fill: string }>`
    fill: ${({ $fill }) => $fill};
    stroke: black;
    stroke-width: 2;
`

const CurrentValue = styled.rect<{ $fill: string }>`
    fill: ${({ $fill }) => $fill};
    stroke: black;
    stroke-width: 1.5;
`

const CurrentValueLabel = styled.text`
    fill: black;
    font-size: 12px;
    font-weight: 800;
`

const HoverGuide = styled.line`
    stroke: rgba(0, 0, 0, 0.34);
    stroke-width: 1.5;
    stroke-dasharray: 4 5;
`

const HoverPoint = styled.circle<{ $fill: string }>`
    fill: ${({ $fill }) => $fill};
    stroke: black;
    stroke-width: 2.5;
`

const HoverTooltip = styled.rect`
    fill: ${({ theme }) => theme.colors.background};
    stroke: black;
    stroke-width: 2;
    filter: drop-shadow(0px 8px 16px rgba(0, 0, 0, 0.16));
`

const HoverTooltipText = styled.text<{ $weight?: number }>`
    fill: black;
    font-size: 12px;
    font-weight: ${({ $weight = 600 }) => $weight};
`

const TooltipSwatch = styled.circle<{ $fill: string }>`
    fill: ${({ $fill }) => $fill};
    stroke: black;
    stroke-width: 1.5;
`

const HoverTarget = styled.rect`
    fill: transparent;
    cursor: crosshair;
    outline: none;

    &:focus-visible {
        stroke: rgba(0, 0, 0, 0.4);
        stroke-width: 1;
        stroke-dasharray: 4 5;
    }
`

const Hero = styled(BlurContainer).attrs((props) => ({
    $width: '100%',
    ...props,
}))`
    overflow: visible;
    z-index: 1;
`

const HeroInner = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 36,
    ...props,
}))``

const HeroCopy = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 24,
    ...props,
}))`
    max-width: 900px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        & h1 {
            font-size: 2.4em;
        }
    `}
`

const BodyGrid = styled(Grid)`
    width: 100%;
    grid-template-columns: 5fr 3fr;
    grid-gap: 48px;
    align-items: start;

    ${({ theme }) => theme.mediaWidth.upToMedium`
        grid-template-columns: 1fr;
        grid-gap: 24px;
        padding: 24px;
    `}
`

const OverviewColumn = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    ...props,
}))``

const SectionHeader = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    ...props,
}))`
    min-height: 60px;
    padding: 24px 0 20px;
`

const OverviewGrid = styled(Grid).attrs((props) => ({
    $width: '100%',
    $columns: 'repeat(6, 1fr)',
    ...props,
}))<DashedContainerProps>`
    ${DashedContainerStyle}

    &::after {
        border-top: none;
        border-right: none;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr;
    `}
`

const MetricCell = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'space-between',
    $align: 'flex-start',
    $gap: 12,
    ...props,
}))<{ $span?: number; $full?: boolean }>`
    ${DashedContainerStyle}
    grid-column: ${({ $full, $span = 2 }) => ($full ? '1 / -1' : `span ${$span}`)};
    min-height: 112px;
    padding: 18px;

    &::after {
        border-bottom: none;
        border-left: none;
        opacity: 0.2;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-column: 1 / -1;
    `}
`

const MetricHeader = styled(Flex).attrs((props) => ({
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    ...props,
}))``

const MetricStack = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 4,
    ...props,
}))``

const MetricValue = styled(Text).attrs((props) => ({
    $fontSize: '1.55em',
    $fontWeight: 700,
    ...props,
}))``

const MetricLabel = styled(CenteredFlex).attrs((props) => ({
    $gap: 6,
    ...props,
}))`
    justify-content: flex-start;
    font-size: 0.85em;
    line-height: 1.3;
`

const ChartCell = styled(MetricCell)`
    min-height: 486px;
`

const ChartHeader = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    $flexWrap: true,
    ...props,
}))``

const RangeSelector = styled(CenteredFlex)`
    min-height: 34px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    overflow: hidden;
`

const RangeButton = styled.button<{ $active?: boolean }>`
    height: 34px;
    min-width: 64px;
    padding: 0 14px;
    border: none;
    border-left: 1px solid rgba(0, 0, 0, 0.12);
    background: ${({ $active, theme }) => ($active ? theme.colors.background : 'rgba(255, 255, 255, 0.35)')};
    font-weight: ${({ $active }) => ($active ? 700 : 400)};
    cursor: pointer;

    &:first-child {
        border-left: none;
    }
`

const ChartFrame = styled.div`
    position: relative;
    width: 100%;
    height: 396px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.38);
    overflow: hidden;
`

const GaugeCell = styled(MetricCell)`
    min-height: 148px;
`

const GaugeTopLabels = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 16,
    ...props,
}))`
    font-size: 0.8em;
`

const GaugeTrack = styled.div`
    position: relative;
    width: 100%;
    height: 14px;
    border: 1px solid rgba(0, 0, 0, 0.25);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.45);
    overflow: hidden;
`

const GaugeFill = styled.div<{ $start: number; $end: number; $direction: 'left' | 'right' }>`
    position: absolute;
    top: 2px;
    bottom: 2px;
    left: ${({ $start }) => $start}%;
    right: ${({ $end }) => 100 - $end}%;
    min-width: 2px;
    border-radius: 999px;
    background: ${({ $direction }) =>
        $direction === 'right'
            ? 'linear-gradient(90deg, #f2d86a 0%, #ffc2ab 68%, #ff9d86 100%)'
            : 'linear-gradient(90deg, #8fe889 0%, #c0f3bb 45%, #f2d86a 100%)'};
    opacity: 0.86;
`

const GaugeCenter = styled.div`
    position: absolute;
    top: -5px;
    bottom: -5px;
    left: 50%;
    width: 0;
    border-left: 2px solid rgba(0, 0, 0, 0.45);
    transform: translateX(-1px);
    z-index: 2;
`

const GaugeMarker = styled.div<{ $position: number }>`
    position: absolute;
    top: -5px;
    left: calc(${({ $position }) => $position}% - 7px);
    width: 14px;
    height: 22px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.background};
    z-index: 3;
`

const GaugeScale = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    ...props,
}))`
    color: rgba(0, 0, 0, 0.65);
    font-size: 0.78em;
`

const GaugeContext = styled(GaugeScale)`
    color: black;
`

const ActionPanel = styled(Flex).attrs((props) => ({
    $column: true,
    $shrink: 0,
    ...props,
}))`
    max-width: 100%;
    height: fit-content;
    position: sticky;
    top: 168px;
    background-color: #f7f1ff;
    border-radius: 24px;
    border: ${({ theme }) => theme.border.medium};
    overflow: hidden;

    ${({ theme }) => theme.mediaWidth.upToMedium`
        position: static;
    `}
`

const ActionHeader = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-end',
    $align: 'flex-start',
    $gap: 12,
    ...props,
}))`
    padding-top: 24px;
    padding-bottom: 20px;
    border-bottom: ${({ theme }) => theme.border.thin};

    & > *:first-child {
        padding: 0 24px;
    }
`

const ActionBody = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 24,
    ...props,
}))`
    padding: 24px;
`

const ActionCopy = styled(Text).attrs((props) => ({
    $fontSize: '0.85em',
    $color: 'rgba(0,0,0,0.85)',
    ...props,
}))`
    line-height: 1.45;
`

const ActionFooter = styled(CenteredFlex).attrs((props) => ({
    $column: true,
    $gap: 12,
    ...props,
}))`
    width: 100%;
    padding: 24px;
    border-top: ${({ theme }) => theme.border.thin};
`

const ActivityPanel = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 24,
    ...props,
}))`
    padding: 24px 0 120px;

    ${({ theme }) => theme.mediaWidth.upToMedium`
        padding: 24px;
    `}
`

const ActivityHeader = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 16,
    $flexWrap: true,
    ...props,
}))``

const ActivityTable = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    ...props,
}))<DashedContainerProps>`
    ${DashedContainerStyle}
`

const ActivityRow = styled(Grid)<{ $header?: boolean }>`
    grid-template-columns: 1.2fr 1fr 1fr 1fr;
    gap: 16px;
    min-height: 56px;
    align-items: center;
    padding: 0 18px;
    font-size: 0.85em;
    font-weight: ${({ $header }) => ($header ? 700 : 400)};
    border-bottom: 1px solid rgba(0, 0, 0, 0.15);

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr 1fr;
    `}
`

const EmptyActivity = styled(CenteredFlex)`
    min-height: 180px;
    padding: 24px;
    color: rgba(0, 0, 0, 0.65);
    text-align: center;
`

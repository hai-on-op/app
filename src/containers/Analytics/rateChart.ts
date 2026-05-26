import { getRatePercentage } from '~/utils/formatting'
import { ONE_DAY_MS, Timeframe } from '~/utils/time'

export type RedemptionRateStat = {
    timestamp: string | number
    redemptionRate: {
        annualizedRate: string
    }
}

export type RateChartPoint = {
    x: Date
    y: number
}

export type RateChartSeries = {
    id: string
    color: string
    data: RateChartPoint[]
}

export type SignedRateYScale = {
    type: 'linear'
    min: number
    max: number | 'auto'
}

type RedemptionRateChartOptions = {
    fallbackAnnualRate?: string
    timeframe?: Timeframe
    nowMs?: number
}

const REDEMPTION_RATE_COLOR = 'hsl(115, 70%, 84%)'
const RATE_DOMAIN_PADDING_RATIO = 0.1
const MIN_RATE_DOMAIN_PADDING_PERCENT = 0.01

export function buildRedemptionRateChart(
    data: readonly RedemptionRateStat[],
    options: RedemptionRateChartOptions = {}
): [RateChartSeries[], SignedRateYScale] {
    const points = data
        .map(({ timestamp, redemptionRate }) => {
            const timestampSeconds = Number(timestamp)
            const ratePercentage = Number(getRatePercentage(redemptionRate.annualizedRate, 4))

            if (!Number.isFinite(timestampSeconds) || !Number.isFinite(ratePercentage)) return null

            return {
                x: new Date(timestampSeconds * 1000),
                y: ratePercentage,
            }
        })
        .filter((point): point is RateChartPoint => point !== null)

    const chartPoints = ensureLinePoints(points, options)

    return [
        [
            {
                id: 'Redemption Rate',
                color: REDEMPTION_RATE_COLOR,
                data: chartPoints,
            },
        ],
        getSignedRateYScale(chartPoints.map(({ y }) => y)),
    ]
}

export function getSignedRateYScale(values: readonly number[]): SignedRateYScale {
    const finiteValues = values.filter(Number.isFinite)

    if (finiteValues.length === 0) {
        return {
            type: 'linear',
            min: 0,
            max: 'auto',
        }
    }

    const min = Math.min(...finiteValues)
    const max = Math.max(...finiteValues)
    const padding = Math.max((max - min) * RATE_DOMAIN_PADDING_RATIO, MIN_RATE_DOMAIN_PADDING_PERCENT)

    return {
        type: 'linear',
        min: Math.min(0, min - padding),
        max: Math.max(0, max + padding),
    }
}

function ensureLinePoints(points: RateChartPoint[], options: RedemptionRateChartOptions): RateChartPoint[] {
    if (points.length >= 2) return points

    const fallbackRatePercentage = points[0]?.y ?? getAnnualRatePercentage(options.fallbackAnnualRate)
    if (!Number.isFinite(fallbackRatePercentage)) return points

    const [start, end] = getTimeframeWindow(options.timeframe ?? Timeframe.ONE_WEEK, options.nowMs ?? Date.now())

    return [
        { x: start, y: fallbackRatePercentage },
        { x: end, y: fallbackRatePercentage },
    ]
}

function getAnnualRatePercentage(value?: string): number {
    const rate = Number(value)
    if (!Number.isFinite(rate)) return Number.NaN

    return rate * 100
}

function getTimeframeWindow(timeframe: Timeframe, nowMs: number): [Date, Date] {
    const end = new Date(nowMs)

    switch (timeframe) {
        case Timeframe.ONE_DAY:
            return [new Date(nowMs - ONE_DAY_MS), end]
        case Timeframe.ONE_MONTH:
            return [new Date(nowMs - 30 * ONE_DAY_MS), end]
        case Timeframe.ONE_YEAR:
            return [new Date(nowMs - 365 * ONE_DAY_MS), end]
        case Timeframe.ONE_WEEK:
        default:
            return [new Date(nowMs - 7 * ONE_DAY_MS), end]
    }
}

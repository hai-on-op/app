import { describe, expect, it } from 'vitest'

import { Timeframe } from '~/utils/time'
import { buildRedemptionRateChart, getSignedRateYScale } from './rateChart'

describe('getSignedRateYScale', () => {
    it('keeps zero as the top of the domain for negative rates', () => {
        const scale = getSignedRateYScale([-0.15, -0.14])

        expect(scale.type).toBe('linear')
        expect(scale.min).toBeCloseTo(-0.16)
        expect(scale.max).toBe(0)
    })

    it('keeps zero as the bottom of the domain for positive rates', () => {
        const scale = getSignedRateYScale([0.12, 0.15])

        expect(scale.min).toBe(0)
        expect(scale.max).toBeCloseTo(0.16)
    })

    it('pads both sides when the rate crosses zero', () => {
        const scale = getSignedRateYScale([-0.15, 0.05])

        expect(scale.min).toBeCloseTo(-0.17)
        expect(scale.max).toBeCloseTo(0.07)
    })

    it('falls back to the default scale when no finite rates exist', () => {
        expect(getSignedRateYScale([Number.NaN])).toEqual({
            type: 'linear',
            min: 0,
            max: 'auto',
        })
    })
})

describe('buildRedemptionRateChart', () => {
    it('converts annualized redemption rates into numeric percentage points', () => {
        const [series, scale] = buildRedemptionRateChart([
            {
                timestamp: '1716163200',
                redemptionRate: {
                    annualizedRate: '0.9985',
                },
            },
            {
                timestamp: '1716249600',
                redemptionRate: {
                    annualizedRate: '0.9986',
                },
            },
        ])

        expect(series[0].id).toBe('Redemption Rate')
        expect(series[0].data).toHaveLength(2)
        expect(series[0].data[0].x).toEqual(new Date(1716163200 * 1000))
        expect(series[0].data[0].y).toBeCloseTo(-0.15)
        expect(scale.min).toBeLessThan(-0.15)
        expect(scale.max).toBe(0)
    })

    it('uses the current annual rate as a timeframe line when history is empty', () => {
        const nowMs = 1716249600 * 1000
        const [series, scale] = buildRedemptionRateChart([], {
            fallbackAnnualRate: '-0.0015',
            timeframe: Timeframe.ONE_DAY,
            nowMs,
        })

        expect(series[0].data).toEqual([
            { x: new Date(nowMs - 24 * 60 * 60 * 1000), y: -0.15 },
            { x: new Date(nowMs), y: -0.15 },
        ])
        expect(scale.min).toBeLessThan(-0.15)
        expect(scale.max).toBe(0)
    })

    it('expands a single historical point into a visible timeframe line', () => {
        const nowMs = 1716249600 * 1000
        const [series] = buildRedemptionRateChart(
            [
                {
                    timestamp: '1716249600',
                    redemptionRate: {
                        annualizedRate: '0.9985',
                    },
                },
            ],
            {
                fallbackAnnualRate: '-0.2',
                timeframe: Timeframe.ONE_WEEK,
                nowMs,
            }
        )

        expect(series[0].data).toEqual([
            { x: new Date(nowMs - 7 * 24 * 60 * 60 * 1000), y: -0.15 },
            { x: new Date(nowMs), y: -0.15 },
        ])
    })
})

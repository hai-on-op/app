import { describe, expect, it } from 'vitest'

import { downsampleSeriesPoints } from './downsample'

describe('downsampleSeriesPoints', () => {
    it('returns the original points when already under the max', () => {
        const points = [{ x: 1 }, { x: 2 }, { x: 3 }]

        expect(downsampleSeriesPoints(points, 5)).toEqual(points)
    })

    it('preserves the first and last points when downsampling', () => {
        const points = Array.from({ length: 100 }, (_, index) => ({ x: index }))

        const sampled = downsampleSeriesPoints(points, 12)

        expect(sampled).toHaveLength(12)
        expect(sampled[0]).toEqual({ x: 0 })
        expect(sampled[sampled.length - 1]).toEqual({ x: 99 })
    })

    it('keeps sampled points in ascending order without duplicates', () => {
        const points = Array.from({ length: 250 }, (_, index) => ({ x: index }))

        const sampled = downsampleSeriesPoints(points, 25)

        expect(sampled).toHaveLength(25)
        expect(new Set(sampled.map((point) => point.x)).size).toBe(sampled.length)
        expect(sampled.every((point, index) => index === 0 || point.x > sampled[index - 1].x)).toBe(true)
    })
})

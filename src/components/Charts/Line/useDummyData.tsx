import { useMemo } from 'react'

import { ONE_DAY_MS, ONE_HOUR_MS, Timeframe } from '~/utils'

// DEV only
type Options = {
    timeframe?: Timeframe
    min?: number
    max?: number
    enabled?: boolean
}
export function useDummyData(baseData: any[], options: Options = {}) {
    const data = useMemo(() => {
        const { timeframe = Timeframe.ONE_WEEK, min = 0, max = 1, enabled = true } = options

        if (!enabled) return []

        const now = Date.now()
        switch (timeframe) {
            case Timeframe.ONE_DAY:
                return baseData.map((d) => ({
                    ...d,
                    data: Array.from({ length: 12 }, (_, i) => ({
                        x: new Date(now - (12 - i) * 2 * ONE_HOUR_MS),
                        y: min + (max - min) * Math.random(),
                    })),
                }))
            case Timeframe.ONE_WEEK:
                return baseData.map((d) => ({
                    ...d,
                    data: Array.from({ length: 7 }, (_, i) => ({
                        x: new Date(now - (7 - i) * ONE_DAY_MS),
                        y: min + (max - min) * Math.random(),
                    })),
                }))
            case Timeframe.ONE_MONTH:
                return baseData.map((d) => ({
                    ...d,
                    data: Array.from({ length: 4 }, (_, i) => ({
                        x: new Date(now - (4 - i) * 7 * ONE_DAY_MS),
                        y: min + (max - min) * Math.random(),
                    })),
                }))
            case Timeframe.ONE_YEAR:
                return baseData.map((d) => ({
                    ...d,
                    data: Array.from({ length: 12 }, (_, i) => ({
                        x: new Date(now - (12 - i) * 30 * ONE_DAY_MS),
                        y: min + (max - min) * Math.random(),
                    })),
                }))
        }
    }, [baseData, options])

    return data
}

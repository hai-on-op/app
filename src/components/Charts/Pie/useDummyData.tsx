import { useMemo } from 'react'

import { type PieChartDatum } from './index'

// DEV only
type Options = {
    min?: number
    max?: number
    enabled?: boolean
}
export function useDummyData(baseData: Omit<PieChartDatum, 'value'>[], options: Options = {}) {
    const data = useMemo(() => {
        const { min = 0, max = 1, enabled = true } = options

        if (!enabled) return []

        return baseData.map((d) => ({
            ...d,
            value: min + (max - min) * Math.random(),
        }))
    }, [baseData, options])

    return data
}

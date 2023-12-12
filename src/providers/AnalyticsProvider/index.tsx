import { createContext, useContext } from 'react'

import type { ReactChildren } from '~/types'
import { Timeframe } from '~/utils'
import { HistoricalStatsReturn, useHistoricalStats } from './useHistoricalStats'
import { DEFAULT_ANALYTICS_DATA, GebAnalyticsData, useGebAnalytics } from './useGebAnalytics'
import { SystemData, useSystemData } from './useSystemData'

type AnalyticsContext = {
    forceRefresh: () => void,
    data: GebAnalyticsData,
    graphData?: SystemData['data'],
    graphSummary?: SystemData['summary'],
    haiPriceHistory: HistoricalStatsReturn,
    redemptionRateHistory: HistoricalStatsReturn
}

const defaultState: AnalyticsContext = {
    forceRefresh: () => undefined,
    data: DEFAULT_ANALYTICS_DATA,
    haiPriceHistory: {
        timeframe: Timeframe.ONE_WEEK,
        setTimeframe: () => undefined,
        loading: false,
        error: undefined,
        data: undefined,
    },
    redemptionRateHistory: {
        timeframe: Timeframe.ONE_WEEK,
        setTimeframe: () => undefined,
        loading: false,
        error: undefined,
        data: undefined,
    },
}

const AnalyticsContext = createContext<AnalyticsContext>(defaultState)

export const useAnalytics = () => useContext(AnalyticsContext)

type Props = {
    children: ReactChildren
}
export function AnalyticsProvider({ children }: Props) {
    const { forceRefresh, data } = useGebAnalytics()

    const { data: graphData, summary: graphSummary } = useSystemData()

    const haiPriceHistory = useHistoricalStats()

    const redemptionRateHistory = useHistoricalStats()

    return (
        <AnalyticsContext.Provider value={{
            forceRefresh,
            data,
            graphData,
            graphSummary,
            haiPriceHistory,
            redemptionRateHistory,
        }}>
            {children}
        </AnalyticsContext.Provider>
    )
}

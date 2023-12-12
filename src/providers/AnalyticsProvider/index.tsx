import { createContext, useContext } from 'react'
import { useQuery } from '@apollo/client'

import type { ReactChildren } from '~/types'
import { type QuerySystemStateData, SYSTEMSTATE_QUERY, Timeframe } from '~/utils'
import { HistoricalStatsReturn, useHistoricalStats } from './useHistoricalStats'
import { DEFAULT_ANALYTICS_DATA, GebAnalyticsData, useGebAnalytics } from './useGebAnalytics'

type AnalyticsContext = {
    forceRefresh: () => void,
    data: GebAnalyticsData,
    graphData?: QuerySystemStateData,
    haiPriceHistory: HistoricalStatsReturn,
    redemptionRateHistory: HistoricalStatsReturn
}

const defaultState: AnalyticsContext = {
    forceRefresh: () => undefined,
    data: DEFAULT_ANALYTICS_DATA,
    graphData: undefined,
    haiPriceHistory: {
        timeframe: Timeframe.ONE_WEEK,
        setTimeframe: () => undefined,
        result: {
            loading: false,
            error: undefined,
            data: {},
        },
    },
    redemptionRateHistory: {
        timeframe: Timeframe.ONE_WEEK,
        setTimeframe: () => undefined,
        result: {
            loading: false,
            error: undefined,
            data: {},
        },
    },
}

const AnalyticsContext = createContext<AnalyticsContext>(defaultState)

export const useAnalytics = () => useContext(AnalyticsContext)

type Props = {
    children: ReactChildren
}
export function AnalyticsProvider({ children }: Props) {
    const { forceRefresh, data } = useGebAnalytics()

    const { data: graphData } = useQuery<QuerySystemStateData>(SYSTEMSTATE_QUERY)

    const haiPriceHistory = useHistoricalStats()

    const redemptionRateHistory = useHistoricalStats()

    return (
        <AnalyticsContext.Provider value={{
            forceRefresh,
            data,
            graphData,
            haiPriceHistory,
            redemptionRateHistory,
        }}>
            {children}
        </AnalyticsContext.Provider>
    )
}

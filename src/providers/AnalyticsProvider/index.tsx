import { createContext, useContext, useMemo } from 'react'

import type { ReactChildren, SummaryItemValue } from '~/types'
import { Timeframe } from '~/utils'
import { type HistoricalStatsReturn, useHistoricalStats } from './useHistoricalStats'
import { DEFAULT_ANALYTICS_DATA, type GebAnalyticsData, useGebAnalytics } from './useGebAnalytics'
import { type SystemData, useSystemData } from './useSystemData'
import { type PoolAnalytics, usePoolAnalytics } from './usePoolAnalytics'

type AnalyticsContext = {
    forceRefresh: () => void
    data: GebAnalyticsData
    graphData?: SystemData['data']
    graphSummary?: SystemData['summary']
    haiPriceHistory: HistoricalStatsReturn
    redemptionRateHistory: HistoricalStatsReturn
    pools: PoolAnalytics
    haiMarketPrice: SummaryItemValue
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
    pools: {
        uniPools: [],
        veloPools: [],
        loading: false,
        error: '',
    },
    haiMarketPrice: {
        raw: '',
        formatted: '$--',
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

    const pools = usePoolAnalytics()

    const haiMarketPrice = useMemo(() => data.marketPrice, [data.marketPrice])

    return (
        <AnalyticsContext.Provider
            value={{
                forceRefresh,
                data,
                graphData,
                graphSummary,
                haiPriceHistory,
                redemptionRateHistory,
                pools,
                haiMarketPrice,
            }}
        >
            {children}
        </AnalyticsContext.Provider>
    )
}

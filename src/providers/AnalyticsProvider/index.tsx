import { createContext, useContext, useMemo, useCallback } from 'react'
import { useQuery, gql } from '@apollo/client'

import type { ReactChildren, SummaryItemValue } from '~/types'
import { Timeframe } from '~/utils/time'
import { type HistoricalStatsReturn, useHistoricalStats } from './useHistoricalStats'
import { DEFAULT_ANALYTICS_DATA, type GebAnalyticsData, useGebAnalytics } from './useGebAnalytics'
import { type SystemData, useSystemData } from './useSystemData'
import { type PoolAnalytics, usePoolAnalytics } from './usePoolAnalytics'

// Add this query to fetch historical price data
const HAI_PRICE_HISTORY_QUERY = gql`
    query GetHaiPriceHistory {
        dailyStats(orderBy: timestamp, orderDirection: desc, first: 1000) {
            id
            timestamp
            marketPriceUsd
        }
    }
`

type AnalyticsContext = {
    forceRefresh: () => void
    data: GebAnalyticsData
    graphData?: SystemData['data']
    graphSummary?: SystemData['summary']
    haiPriceHistory: HistoricalStatsReturn
    redemptionRateHistory: HistoricalStatsReturn
    pools: PoolAnalytics
    haiMarketPrice: SummaryItemValue
    haiPricePerformance: {
        day30: number
        day60: number
        day90: number
        priceHistory: Array<{ timestamp: number; price: number }>
        loading: boolean
    }
}

type AnalyticsSummaryContextValue = Pick<
    AnalyticsContext,
    'forceRefresh' | 'data' | 'graphData' | 'graphSummary' | 'haiMarketPrice'
>
type AnalyticsDetailContextValue = Pick<
    AnalyticsContext,
    'haiPriceHistory' | 'redemptionRateHistory' | 'pools' | 'haiPricePerformance'
>

const defaultAnalyticsDetailsState: AnalyticsDetailContextValue = {
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
    haiPricePerformance: {
        day30: 0,
        day60: 0,
        day90: 0,
        priceHistory: [],
        loading: true,
    },
}

const defaultAnalyticsSummaryState: AnalyticsSummaryContextValue = {
    forceRefresh: () => undefined,
    data: DEFAULT_ANALYTICS_DATA,
    haiMarketPrice: {
        raw: '',
        formatted: '$--',
    },
}

const AnalyticsSummaryContext = createContext<AnalyticsSummaryContextValue>(defaultAnalyticsSummaryState)
const AnalyticsDetailContext = createContext<AnalyticsDetailContextValue>(defaultAnalyticsDetailsState)

export const useAnalytics = () => {
    const summary = useContext(AnalyticsSummaryContext)
    const details = useContext(AnalyticsDetailContext)

    return useMemo(
        () => ({
            ...summary,
            ...details,
        }),
        [summary, details]
    )
}

type Props = {
    children: ReactChildren
}
export function AnalyticsProvider({ children }: Props) {
    const { forceRefresh, data } = useGebAnalytics()

    const { data: graphData, summary: graphSummary } = useSystemData()

    const haiMarketPrice = useMemo(() => data.marketPrice, [data.marketPrice])

    return (
        <AnalyticsSummaryContext.Provider
            value={{
                forceRefresh,
                data,
                graphData,
                graphSummary,
                haiMarketPrice,
            }}
        >
            {children}
        </AnalyticsSummaryContext.Provider>
    )
}

export function AnalyticsDetailsProvider({ children }: Props) {
    const haiPriceHistory = useHistoricalStats()

    const redemptionRateHistory = useHistoricalStats()

    const pools = usePoolAnalytics()

    // Add the price history query
    const { data: priceHistoryData, loading: priceHistoryLoading } = useQuery(HAI_PRICE_HISTORY_QUERY)

    // Fix type error and improve price finding logic
    type PricePoint = {
        timestamp: number
        price: number
    }

    const findNearestPrice = useCallback((priceHistory: PricePoint[], targetTimestamp: number) => {
        return priceHistory.reduce((prev: PricePoint, curr: PricePoint) => {
            return Math.abs(curr.timestamp - targetTimestamp) < Math.abs(prev.timestamp - targetTimestamp) ? curr : prev
        }, priceHistory[0]).price
    }, [])

    const haiPricePerformance = useMemo(() => {
        if (!priceHistoryData?.dailyStats) {
            return defaultAnalyticsDetailsState.haiPricePerformance
        }

        const priceHistory = priceHistoryData.dailyStats
            .map((stat: any) => ({
                timestamp: Number(stat.timestamp),
                price: Number(stat.marketPriceUsd),
            }))
            .filter((point: PricePoint) => point.price > 0)
            .sort((a: PricePoint, b: PricePoint) => a.timestamp - b.timestamp)

        const currentPrice = priceHistory[priceHistory.length - 1]?.price || 0
        const now = Math.floor(Date.now() / 1000)

        // Find prices nearest to 30, 60, and 90 days ago
        const day30ago = now - 30 * 24 * 60 * 60
        const day60ago = now - 60 * 24 * 60 * 60
        const day90ago = now - 90 * 24 * 60 * 60

        const price30DaysAgo = findNearestPrice(priceHistory, day30ago)
        const price60DaysAgo = findNearestPrice(priceHistory, day60ago)
        const price90DaysAgo = findNearestPrice(priceHistory, day90ago)

        const calcPercentChange = (oldPrice: number, newPrice: number) => {
            return oldPrice ? ((newPrice - oldPrice) / oldPrice) * 100 : 0
        }

        return {
            day30: calcPercentChange(price30DaysAgo, currentPrice),
            day60: calcPercentChange(price60DaysAgo, currentPrice),
            day90: calcPercentChange(price90DaysAgo, currentPrice),
            priceHistory,
            loading: priceHistoryLoading,
        }
    }, [priceHistoryData, priceHistoryLoading, findNearestPrice])

    return (
        <AnalyticsDetailContext.Provider
            value={{
                haiPriceHistory,
                redemptionRateHistory,
                pools,
                haiPricePerformance,
            }}
        >
            {children}
        </AnalyticsDetailContext.Provider>
    )
}

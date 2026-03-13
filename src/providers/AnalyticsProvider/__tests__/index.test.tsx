import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Timeframe } from '~/utils/time'

const {
    useGebAnalyticsMock,
    useSystemDataMock,
    useHistoricalStatsMock,
    usePoolAnalyticsMock,
    useQueryMock,
} = vi.hoisted(() => ({
    useGebAnalyticsMock: vi.fn(),
    useSystemDataMock: vi.fn(),
    useHistoricalStatsMock: vi.fn(),
    usePoolAnalyticsMock: vi.fn(),
    useQueryMock: vi.fn(),
}))

vi.mock('@apollo/client', () => ({
    gql: (strings: TemplateStringsArray) => strings[0],
    useQuery: useQueryMock,
}))

vi.mock('../useGebAnalytics', () => ({
    DEFAULT_ANALYTICS_DATA: {
        erc20Supply: { raw: '', formatted: '--' },
        globalDebt: { raw: '', formatted: '--' },
        globalDebtUtilization: '--%',
        globalDebtCeiling: { raw: '', formatted: '--' },
        surplusInTreasury: { raw: '', formatted: '--' },
        marketPrice: { raw: '', formatted: '$--' },
        redemptionPrice: { raw: '', formatted: '$--' },
        priceDiff: 0,
        annualRate: { raw: '', formatted: '--%' },
        eightRate: { raw: '', formatted: '--%' },
        pRate: { raw: '', formatted: '--%' },
        iRate: { raw: '', formatted: '--%' },
        tokenAnalyticsData: [],
    },
    useGebAnalytics: useGebAnalyticsMock,
}))

vi.mock('../useSystemData', () => ({
    useSystemData: useSystemDataMock,
}))

vi.mock('../useHistoricalStats', () => ({
    useHistoricalStats: useHistoricalStatsMock,
}))

vi.mock('../usePoolAnalytics', () => ({
    usePoolAnalytics: usePoolAnalyticsMock,
}))

import { AnalyticsDetailsProvider, AnalyticsProvider, useAnalytics } from '..'

function Probe() {
    const analytics = useAnalytics()

    return (
        <>
            <div data-testid="market-price">{analytics.haiMarketPrice.formatted}</div>
            <div data-testid="total-vaults">{analytics.graphSummary?.totalVaults.formatted || '--'}</div>
            <div data-testid="pool-count">{analytics.pools.uniPools.length}</div>
            <div data-testid="price-history-count">{analytics.haiPricePerformance.priceHistory.length}</div>
            <div data-testid="hai-timeframe">{String(analytics.haiPriceHistory.timeframe)}</div>
            <div data-testid="redemption-timeframe">{String(analytics.redemptionRateHistory.timeframe)}</div>
        </>
    )
}

describe('AnalyticsProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        useGebAnalyticsMock.mockReturnValue({
            forceRefresh: vi.fn(),
            data: {
                marketPrice: {
                    raw: '1.01',
                    formatted: '$1.01',
                },
                redemptionPrice: {
                    raw: '1.00',
                    formatted: '$1.00',
                },
                tokenAnalyticsData: [],
            },
        })

        useSystemDataMock.mockReturnValue({
            data: undefined,
            summary: {
                totalVaults: {
                    raw: '42',
                    formatted: '42',
                },
            },
        })

        useHistoricalStatsMock.mockReturnValue({
            timeframe: Timeframe.ONE_MONTH,
            setTimeframe: vi.fn(),
            loading: false,
            error: undefined,
            data: undefined,
        })

        usePoolAnalyticsMock.mockReturnValue({
            uniPools: [],
            veloPools: [],
            loading: false,
            error: '',
        })

        useQueryMock.mockReturnValue({
            data: undefined,
            loading: false,
        })
    })

    it('provides shared summary data without loading analytics route details', () => {
        render(
            <AnalyticsProvider>
                <Probe />
            </AnalyticsProvider>
        )

        expect(screen.getByTestId('market-price').textContent).toBe('$1.01')
        expect(screen.getByTestId('total-vaults').textContent).toBe('42')
        expect(screen.getByTestId('pool-count').textContent).toBe('0')
        expect(screen.getByTestId('price-history-count').textContent).toBe('0')
        expect(screen.getByTestId('hai-timeframe').textContent).toBe(String(Timeframe.ONE_WEEK))
        expect(screen.getByTestId('redemption-timeframe').textContent).toBe(String(Timeframe.ONE_WEEK))
        expect(useHistoricalStatsMock).not.toHaveBeenCalled()
        expect(usePoolAnalyticsMock).not.toHaveBeenCalled()
        expect(useQueryMock).not.toHaveBeenCalled()
    })

    it('merges analytics route detail data when nested under AnalyticsDetailsProvider', () => {
        useHistoricalStatsMock
            .mockReturnValueOnce({
                timeframe: Timeframe.ONE_MONTH,
                setTimeframe: vi.fn(),
                loading: false,
                error: undefined,
                data: undefined,
            })
            .mockReturnValueOnce({
                timeframe: Timeframe.ONE_YEAR,
                setTimeframe: vi.fn(),
                loading: false,
                error: undefined,
                data: undefined,
            })

        usePoolAnalyticsMock.mockReturnValue({
            uniPools: [{ id: 'pool-1' }],
            veloPools: [],
            loading: false,
            error: '',
        })

        useQueryMock.mockReturnValue({
            data: {
                dailyStats: [
                    { timestamp: 1_700_000_000, marketPriceUsd: '1.00' },
                    { timestamp: 1_702_592_000, marketPriceUsd: '1.05' },
                ],
            },
            loading: false,
        })

        render(
            <AnalyticsProvider>
                <AnalyticsDetailsProvider>
                    <Probe />
                </AnalyticsDetailsProvider>
            </AnalyticsProvider>
        )

        expect(screen.getByTestId('market-price').textContent).toBe('$1.01')
        expect(screen.getByTestId('total-vaults').textContent).toBe('42')
        expect(screen.getByTestId('pool-count').textContent).toBe('1')
        expect(screen.getByTestId('price-history-count').textContent).toBe('2')
        expect(screen.getByTestId('hai-timeframe').textContent).toBe(String(Timeframe.ONE_MONTH))
        expect(screen.getByTestId('redemption-timeframe').textContent).toBe(String(Timeframe.ONE_YEAR))
        expect(useHistoricalStatsMock).toHaveBeenCalledTimes(2)
        expect(usePoolAnalyticsMock).toHaveBeenCalledTimes(1)
        expect(useQueryMock).toHaveBeenCalledTimes(1)
    })
})

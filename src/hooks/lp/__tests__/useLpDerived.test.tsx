import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import { useLpUserPositionsMap } from '../useLpUserPositionsMap'
import { useLpCurrentPositions } from '../useLpCurrentPositions'
import { useLpUserTotalLiquidity } from '../useLpUserTotalLiquidity'
import * as allPositionsHook from '../useLpAllPositions'
import * as userPositionsHook from '../useLpUserPositions'
import * as currentPositionsHook from '../useLpCurrentPositions'
import * as poolHook from '../useLpPool'
import * as lpService from '~/services/lpData'
import * as analyticsProvider from '~/providers/AnalyticsProvider'
import * as veloProvider from '~/providers/VelodromePriceProvider'

describe('LP derived hooks', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    function MapComp() {
        const { data, isLoading } = useLpUserPositionsMap()
        if (isLoading) return <div>loading</div>
        const keys = data ? Object.keys(data).length : 0
        return <div data-testid="keys">{keys}</div>
    }

    function CurrentComp({ address }: { address: `0x${string}` }) {
        const { data, isLoading } = useLpCurrentPositions(address)
        if (isLoading) return <div>loading</div>
        return <div data-testid="curr">{data?.length ?? 0}</div>
    }

    function LiquidityComp({ address }: { address: `0x${string}` }) {
        const { loading, value } = useLpUserTotalLiquidity(address)
        if (loading) return <div>loading</div>
        return <div data-testid="liq">{value}</div>
    }

    function ValueComp({ address }: { address: `0x${string}` }) {
        const { data: pool, isLoading: poolLoading } = poolHook.useLpPool()
        const { data: currentPositions, isLoading: curLoading } = currentPositionsHook.useLpCurrentPositions(address)
        const { haiMarketPrice, data: { tokenAnalyticsData } } = analyticsProvider.useAnalytics()
        const token0UsdPrice = React.useMemo(() => parseFloat(haiMarketPrice.raw || '0'), [haiMarketPrice])
        const token1UsdPrice = React.useMemo(() => {
            const weth = tokenAnalyticsData.find((t: any) => t.symbol === 'WETH')
            return weth ? Number(weth.currentPrice) / 1e18 : 0
        }, [tokenAnalyticsData])
        const loading = poolLoading || curLoading
        const value = React.useMemo(() => {
            if (!pool || !currentPositions) return 0
            return lpService.calculateUserPositionsValue(currentPositions as any, pool as any, token0UsdPrice, token1UsdPrice)
        }, [pool, currentPositions, token0UsdPrice, token1UsdPrice])
        if (loading) return <div>loading</div>
        return <div data-testid="val">{value}</div>
    }

    it('useLpUserPositionsMap groups by owner', async () => {
        vi.spyOn(allPositionsHook, 'useLpAllPositions').mockReturnValue({
            data: [
                { id: '1', liquidity: '1', depositedToken0: '0', depositedToken1: '0', withdrawnToken0: '0', withdrawnToken1: '0', tickLower: { tickIdx: '0' }, tickUpper: { tickIdx: '1' }, owner: '0xaaa' },
                { id: '2', liquidity: '2', depositedToken0: '0', depositedToken1: '0', withdrawnToken0: '0', withdrawnToken1: '0', tickLower: { tickIdx: '0' }, tickUpper: { tickIdx: '1' }, owner: '0xbbb' },
                { id: '3', liquidity: '3', depositedToken0: '0', depositedToken1: '0', withdrawnToken0: '0', withdrawnToken1: '0', tickLower: { tickIdx: '0' }, tickUpper: { tickIdx: '1' }, owner: '0xbbb' },
            ],
            isLoading: false,
            isError: false,
            error: undefined,
        } as any)

        renderWithProviders(<MapComp />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('keys').textContent).toBe('2')
    })

    it('useLpCurrentPositions composes from pool + user positions', async () => {
        vi.spyOn(poolHook, 'useLpPool').mockReturnValue({ data: { id: 'pool', liquidity: '0', totalValueLockedToken0: '0', totalValueLockedToken1: '0', totalValueLockedUSD: '0', token0: { symbol: 'HAI', decimals: 18 }, token1: { symbol: 'WETH', decimals: 18 }, token0Price: '1', token1Price: '1', tick: '0', sqrtPrice: '0' }, isLoading: false } as any)
        vi.spyOn(userPositionsHook, 'useLpUserPositions').mockReturnValue({ data: [{ id: '1', liquidity: '1', depositedToken0: '0', depositedToken1: '0', withdrawnToken0: '0', withdrawnToken1: '0', tickLower: { tickIdx: '0' }, tickUpper: { tickIdx: '1' }, owner: '0xaaa' }], isLoading: false } as any)
        vi.spyOn(lpService, 'calculateCurrentPositionComposition').mockReturnValue([
            { id: '1', liquidity: '1', currentToken0: '1', currentToken1: '2', tickLower: { tickIdx: '0' }, tickUpper: { tickIdx: '1' }, owner: '0xaaa' },
        ])

        renderWithProviders(<CurrentComp address={'0x'.padEnd(42, 'a') as any} />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('curr').textContent).toBe('1')
    })

    it('useLpUserTotalLiquidity sums liquidity', async () => {
        vi.spyOn(userPositionsHook, 'useLpUserPositions').mockReturnValue({ data: [
            { id: '1', liquidity: '1', depositedToken0: '0', depositedToken1: '0', withdrawnToken0: '0', withdrawnToken1: '0', tickLower: { tickIdx: '0' }, tickUpper: { tickIdx: '1' }, owner: '0xaaa' },
            { id: '2', liquidity: '3', depositedToken0: '0', depositedToken1: '0', withdrawnToken0: '0', withdrawnToken1: '0', tickLower: { tickIdx: '0' }, tickUpper: { tickIdx: '1' }, owner: '0xaaa' },
        ], isLoading: false } as any)

        renderWithProviders(<LiquidityComp address={'0x'.padEnd(42, 'a') as any} />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('liq').textContent).toBe('4')
    })

    it('useLpUserPositionValue computes USD value from positions and prices', async () => {
        vi.spyOn(poolHook, 'useLpPool').mockReturnValue({ data: { id: 'pool', liquidity: '0', totalValueLockedToken0: '0', totalValueLockedToken1: '0', totalValueLockedUSD: '0', token0: { symbol: 'HAI', decimals: 18 }, token1: { symbol: 'WETH', decimals: 18 }, token0Price: '1', token1Price: '1', tick: '0', sqrtPrice: '0' }, isLoading: false } as any)
        vi.spyOn(currentPositionsHook, 'useLpCurrentPositions').mockReturnValue({ data: [
            { id: '1', liquidity: '1', currentToken0: '1', currentToken1: '2', tickLower: { tickIdx: '0' }, tickUpper: { tickIdx: '1' }, owner: '0xaaa' },
        ], isLoading: false })
        vi.spyOn(analyticsProvider, 'useAnalytics').mockReturnValue({ haiMarketPrice: { raw: '1' }, data: { tokenAnalyticsData: [{ symbol: 'WETH', currentPrice: (2000n * 10n**18n).toString() }] } } as any)
        vi.spyOn(veloProvider, 'useVelodromePrices').mockReturnValue({ prices: { VELO: { raw: '1' } }, loading: false } as any)
        vi.spyOn(lpService, 'calculateUserPositionsValue').mockReturnValue(123.45)

        renderWithProviders(<ValueComp address={'0x'.padEnd(42, 'a') as any} />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('val').textContent).toBe('123.45')
    })
})



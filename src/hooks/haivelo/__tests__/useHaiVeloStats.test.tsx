import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import * as dataSources from '~/services/haivelo/dataSources'
import { useHaiVeloStats } from '../useHaiVeloStats'

function Comp() {
    const { v1, v2, combined, isLoading } = useHaiVeloStats(1)
    if (isLoading) return <div>loading</div>
    return (
        <div>
            <div data-testid="v1">{v1.totalDeposited}</div>
            <div data-testid="v2">{v2.totalDeposited}</div>
            <div data-testid="combined">{combined.totalDeposited}</div>
            <div data-testid="usd">{combined.tvlUsd}</div>
        </div>
    )
}

describe('useHaiVeloStats', () => {
    beforeEach(() => { vi.resetAllMocks() })
    afterEach(() => { vi.restoreAllMocks() })

    it('returns combined stats from v1 subgraph and v2 chain', async () => {
        vi.spyOn(dataSources, 'fetchV1Safes').mockResolvedValue({ totalCollateral: '100', safes: [] } as any)
        vi.spyOn(dataSources, 'fetchV2Totals').mockResolvedValue({ totalSupplyRaw: '200000000000000000000', totalSupplyFormatted: '200', decimals: 18 } as any)

        renderWithProviders(<Comp />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('v1').textContent).toBe('100')
        expect(screen.getByTestId('v2').textContent).toBe('200')
        expect(screen.getByTestId('combined').textContent).toBe('300')
        expect(screen.getByTestId('usd').textContent).toBe('300')
    })
})



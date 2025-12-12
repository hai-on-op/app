import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import * as dataSources from '~/services/haivelo/dataSources'
import { useHaiVeloAccount } from '../useHaiVeloAccount'

function Comp() {
    const { v2Balance, velo, isLoading } = useHaiVeloAccount('0x'.padEnd(42, 'a'))
    if (isLoading) return <div>loading</div>
    return (
        <div>
            <div data-testid="v2">{v2Balance.formatted}</div>
            <div data-testid="velo">{velo.formatted}</div>
        </div>
    )
}

describe('useHaiVeloAccount', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns per-user balances across versions and assets', async () => {
        vi.spyOn(dataSources, 'fetchV2UserBalance').mockResolvedValue({
            raw: '1000000000000000000',
            formatted: '1',
            decimals: 18,
        } as any)
        vi.spyOn(dataSources, 'fetchVeloBalance').mockResolvedValue({
            raw: '500000000000000000',
            formatted: '0.5',
            decimals: 18,
        } as any)
        vi.spyOn(dataSources, 'fetchVeNftsForOwner').mockResolvedValue({
            totalRaw: '0',
            totalFormatted: '0',
            nfts: [],
        } as any)

        renderWithProviders(<Comp />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('v2').textContent).toBe('1')
        expect(screen.getByTestId('velo').textContent).toBe('0.5')
    })
})

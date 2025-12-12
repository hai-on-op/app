import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import * as dataSources from '~/services/haivelo/dataSources'
import { useHaiVeloCollateralMapping } from '../useHaiVeloCollateralMapping'

function Comp() {
    const { mapping, isLoading } = useHaiVeloCollateralMapping()
    if (isLoading) return <div>loading</div>
    return (
        <div>
            <div data-testid="aaa">{mapping['0xaaa'] || ''}</div>
            <div data-testid="bbb">{mapping['0xbbb'] || ''}</div>
        </div>
    )
}

describe('useHaiVeloCollateralMapping', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('builds a mapping from v1 safes', async () => {
        vi.spyOn(dataSources, 'fetchV1Safes').mockResolvedValue({
            totalCollateral: '0',
            safes: [
                { owner: { address: '0xAAA' }, collateral: '1' },
                { owner: { address: '0xaaa' }, collateral: '2' },
                { owner: { address: '0xBBB' }, collateral: '3' },
            ],
        } as any)

        renderWithProviders(<Comp />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('aaa').textContent).toBe('3')
        expect(screen.getByTestId('bbb').textContent).toBe('3')
    })
})

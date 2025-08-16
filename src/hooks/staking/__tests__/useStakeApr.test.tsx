import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { BigNumber } from 'ethers'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import * as apyHook from '../useStakingApy'
import * as statsHook from '../useStakeStats'
import * as pricesHook from '../useStakePrices'
import { useStakeApr } from '../useStakeApr'

function Comp() {
    const { loading, value, formatted } = useStakeApr()
    if (loading) return <div>loading</div>
    return (
        <div>
            <div data-testid="val">{value}</div>
            <div data-testid="fmt">{formatted}</div>
        </div>
    )
}

describe('useStakeApr', () => {
    it('returns 0 when total staked is zero', async () => {
        vi.spyOn(apyHook, 'useStakingApy').mockReturnValue({ data: [{ id: 0, rpToken: 'KITE', rpRate: ({ mul: () => ({ toString: () => '0' }) } as any) } as any], isLoading: false } as any)
        vi.spyOn(statsHook, 'useStakeStats').mockReturnValue({ data: { totalStaked: '0' }, isLoading: false } as any)
        vi.spyOn(pricesHook, 'useStakePrices').mockReturnValue({ data: { kitePrice: 1, haiPrice: 1, opPrice: 1 }, loading: false } as any)
        renderWithProviders(<Comp />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(Number(screen.getByTestId('val').textContent)).toBe(0)
    })

    it('computes positive APR when inputs are non-zero', async () => {
        vi.spyOn(apyHook, 'useStakingApy').mockReturnValue({
            data: [{ id: 0, rpToken: 'KITE', rpRate: BigNumber.from('1000000000000000') }], // 0.001 / sec
            isLoading: false,
        } as any)
        vi.spyOn(statsHook, 'useStakeStats').mockReturnValue({ data: { totalStaked: '100' }, isLoading: false } as any)
        vi.spyOn(pricesHook, 'useStakePrices').mockReturnValue({ data: { kitePrice: 2, haiPrice: 1, opPrice: 1 }, loading: false } as any)
        renderWithProviders(<Comp />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('fmt').textContent).toContain('%')
    })
})



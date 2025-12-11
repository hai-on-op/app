import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import * as statsHook from '../useStakeStats'
import * as effHook from '../useStakeEffectiveBalance'
import { useStakeShare } from '../useStakeShare'

function Comp({ address }: { address: `0x${string}` }) {
    const { loading, value, percentage } = useStakeShare(address)
    if (loading) return <div>loading</div>
    return (
        <div>
            <div data-testid="val">{value}</div>
            <div data-testid="pct">{percentage}</div>
        </div>
    )
}

describe('useStakeShare', () => {
    it('computes share correctly', async () => {
        vi.spyOn(statsHook, 'useStakeStats').mockReturnValue({ data: { totalStaked: '100' }, isLoading: false } as any)
        vi.spyOn(effHook, 'useStakeEffectiveBalance').mockReturnValue({ loading: false, value: 25 })
        renderWithProviders(<Comp address={'0x'.padEnd(42, 'a') as any} />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(Number(screen.getByTestId('val').textContent)).toBe(25)
        expect(screen.getByTestId('pct').textContent).toContain('%')
    })

    it('returns 0% when total = 0', async () => {
        vi.spyOn(statsHook, 'useStakeStats').mockReturnValue({ data: { totalStaked: '0' }, isLoading: false } as any)
        vi.spyOn(effHook, 'useStakeEffectiveBalance').mockReturnValue({ loading: false, value: 10 })
        renderWithProviders(<Comp address={'0x'.padEnd(42, 'a') as any} />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(Number(screen.getByTestId('val').textContent)).toBe(0)
        expect(screen.getByTestId('pct').textContent).toBe('0%')
    })
})



import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import * as accountHook from '../useStakeAccount'
import { useStakeEffectiveBalance } from '../useStakeEffectiveBalance'

function Comp({ address }: { address: `0x${string}` }) {
    const { loading, value } = useStakeEffectiveBalance(address)
    if (loading) return <div>loading</div>
    return <div data-testid="val">{value}</div>
}

describe('useStakeEffectiveBalance', () => {
    it('subtracts pending withdrawal amount', async () => {
        vi.spyOn(accountHook, 'useStakeAccount').mockReturnValue({
            data: { stakedBalance: '10', pendingWithdrawal: { amount: '3', timestamp: 0 }, rewards: [], cooldown: 0 },
            isLoading: false,
        } as any)
        renderWithProviders(<Comp address={'0x'.padEnd(42, 'a') as any} />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(Number(screen.getByTestId('val').textContent)).toBe(7)
    })

    it('returns base when no pending', async () => {
        vi.spyOn(accountHook, 'useStakeAccount').mockReturnValue({
            data: { stakedBalance: '5', pendingWithdrawal: null, rewards: [], cooldown: 0 },
            isLoading: false,
        } as any)
        renderWithProviders(<Comp address={'0x'.padEnd(42, 'a') as any} />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(Number(screen.getByTestId('val').textContent)).toBe(5)
    })
})

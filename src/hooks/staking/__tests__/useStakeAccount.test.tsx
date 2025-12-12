import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import * as stakingService from '~/services/stakingService'
import { useStakeAccount } from '../useStakeAccount'

function Comp({ address }: { address: `0x${string}` }) {
    const { data, isLoading, error } = useStakeAccount(address)
    if (isLoading) return <div>loading</div>
    if (error) return <div>error</div>
    return (
        <div>
            <div data-testid="bal">{data?.stakedBalance}</div>
            <div data-testid="cooldown">{data?.cooldown}</div>
            <div data-testid="rewards">{data?.rewards.length}</div>
        </div>
    )
}

describe('useStakeAccount', () => {
    it('returns account data from services', async () => {
        vi.spyOn(stakingService, 'getStakedBalance').mockResolvedValue('1.23')
        vi.spyOn(stakingService, 'getPendingWithdrawal').mockResolvedValue(null)
        vi.spyOn(stakingService, 'getRewards').mockResolvedValue([])
        vi.spyOn(stakingService, 'getCooldown').mockResolvedValue(86400)

        renderWithProviders(<Comp address={'0x'.padEnd(42, 'a') as any} />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('bal').textContent).toBe('1.23')
        expect(screen.getByTestId('cooldown').textContent).toBe('86400')
        expect(screen.getByTestId('rewards').textContent).toBe('0')
    })
})

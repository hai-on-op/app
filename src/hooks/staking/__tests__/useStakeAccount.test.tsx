import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import { defaultStakingService } from '~/services/stakingService'
import * as hooks from '~/hooks'
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
    beforeEach(() => {
        vi.clearAllMocks()
        // Mock usePublicProvider to return a mock provider
        vi.spyOn(hooks, 'usePublicProvider').mockReturnValue({} as any)
    })

    it('returns account data from services', async () => {
        // Set up mocks before rendering
        vi.spyOn(defaultStakingService, 'getStakedBalance').mockResolvedValue('1.23')
        vi.spyOn(defaultStakingService, 'getPendingWithdrawal').mockResolvedValue(null)
        vi.spyOn(defaultStakingService, 'getRewards').mockResolvedValue([])
        vi.spyOn(defaultStakingService, 'getCooldown').mockResolvedValue(86400)

        renderWithProviders(<Comp address={'0x'.padEnd(42, 'a') as any} />)

        // Wait for the data to appear instead of waiting for loading to disappear
        await waitFor(
            () => {
                expect(screen.getByTestId('bal')).toBeTruthy()
            },
            { timeout: 3000 }
        )

        expect(screen.getByTestId('bal').textContent).toBe('1.23')
        expect(screen.getByTestId('cooldown').textContent).toBe('86400')
        expect(screen.getByTestId('rewards').textContent).toBe('0')
    })
})

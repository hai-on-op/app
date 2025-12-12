import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import * as stakingService from '~/services/stakingService'
import { useStakeStats } from '../useStakeStats'

function Comp() {
    const { data, isLoading, error } = useStakeStats()
    if (isLoading) return <div>loading</div>
    if (error) return <div>error</div>
    return <div data-testid="total">{data?.totalStaked}</div>
}

describe('useStakeStats', () => {
    it('returns stats from services', async () => {
        // Spy on defaultStakingService.getTotalStaked because useStakeStats uses the object directly
        vi.spyOn(stakingService.defaultStakingService, 'getTotalStaked').mockResolvedValue('100.5')
        renderWithProviders(<Comp />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('total').textContent).toBe('100.5')
    })
})

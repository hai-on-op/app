import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import * as stakingRewardsService from '~/services/rewards/stakingRewardsService'
import { useStakingApy } from '../useStakingApy'

function Comp() {
    const { data, isLoading, error } = useStakingApy()
    if (isLoading) return <div>loading</div>
    if (error) return <div>error</div>
    return <div data-testid="count">{data?.length}</div>
}

describe('useStakingApy', () => {
    it('returns apy list from services', async () => {
        vi.spyOn(stakingRewardsService, 'getApy').mockResolvedValue([{ id: 0, rpToken: 'X', rpRateWei: '1.0' } as any])
        renderWithProviders(<Comp />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('count').textContent).toBe('1')
    })
})

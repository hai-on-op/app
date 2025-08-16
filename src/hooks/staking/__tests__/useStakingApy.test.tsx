import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import * as rewardsService from '~/services/rewardsService'
import { useStakingApy } from '../useStakingApy'

function Comp() {
    const { data, isLoading, error } = useStakingApy()
    if (isLoading) return <div>loading</div>
    if (error) return <div>error</div>
    return <div data-testid="count">{data?.length}</div>
}

describe('useStakingApy', () => {
    it('returns apy list from services', async () => {
        vi.spyOn(rewardsService, 'getStakingApy').mockResolvedValue([{ id: 0, rpToken: 'X', rpRate: ({} as any) }])
        renderWithProviders(<Comp />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('count').textContent).toBe('1')
    })
})



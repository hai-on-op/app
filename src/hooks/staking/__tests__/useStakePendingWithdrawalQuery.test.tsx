import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { waitFor, screen } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import { useStakePendingWithdrawalQuery } from '~/hooks/staking/useStakePendingWithdrawalQuery'

vi.mock('~/utils/graphql/client', () => ({
    client: {
        query: vi.fn(() =>
            Promise.resolve({
                data: {
                    haiVeloVeloLPStakingUser: {
                        id: '0xabc',
                        pendingWithdrawal: {
                            id: '0xabc',
                            amount: '5000000000000000000',
                            timestamp: 1000,
                            status: 'PENDING',
                        },
                    },
                },
            })
        ),
    },
}))

function TestComponent() {
    const query = useStakePendingWithdrawalQuery('lp-hai-velo-velo', '0xAbC', {
        userEntity: 'haiVeloVeloLPStakingUser',
        idForUser: (addr) => addr.toLowerCase(),
    })

    if (query.isLoading) {
        return <div>loading</div>
    }

    return (
        <div>
            <span data-testid="amount">{query.data?.amount ?? ''}</span>
            <span data-testid="timestamp">{query.data?.timestamp ?? ''}</span>
        </div>
    )
}

describe('useStakePendingWithdrawalQuery', () => {
    it('reads pendingWithdrawal for LP staking user entity', async () => {
        renderWithProviders(<TestComponent />)

        await waitFor(() => {
            expect(screen.getByTestId('amount').textContent).toBe('5.0')
            expect(screen.getByTestId('timestamp').textContent).toBe('1000')
        })
    })
})



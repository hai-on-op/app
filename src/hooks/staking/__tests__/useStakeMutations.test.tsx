import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import { useStakeMutations } from '../useStakeMutations'
import * as svc from '~/services/stakingService'
import { useQueryClient } from '@tanstack/react-query'
import { useEthersSigner } from '~/hooks/useEthersAdapters'

// Mock useEthersSigner via its defining module
vi.mock('~/hooks/useEthersAdapters', async () => {
    const actual = await vi.importActual<typeof import('~/hooks/useEthersAdapters')>('~/hooks/useEthersAdapters')
    return {
        ...actual,
        useEthersSigner: vi.fn(),
    }
})

function Comp({ address }: { address: `0x${string}` }) {
    const qc = useQueryClient()
    const { stake, initiateWithdrawal, withdraw, cancelWithdrawal, claimRewards } = useStakeMutations(address, 'kite')
    return (
        <div>
            <button
                onClick={() => {
                    qc.setQueryData(['stake', 'kite', 'account', address.toLowerCase()], {
                        stakedBalance: '1',
                        pendingWithdrawal: null,
                        rewards: [{ tokenAddress: '0x'.padEnd(42, '1') as any, amount: '1' }],
                        cooldown: 86400,
                    })
                    qc.setQueryData(['stake', 'kite', 'stats'], { totalStaked: '100' })
                }}
            >
                seed
            </button>
            <button onClick={() => stake.mutate('2')}>stake</button>
            <button onClick={() => initiateWithdrawal.mutate('0.5')}>unstake</button>
            <button onClick={() => withdraw.mutate()}>withdraw</button>
            <button onClick={() => cancelWithdrawal.mutate()}>cancel</button>
            <button onClick={() => claimRewards.mutate()}>claim</button>
            <span data-testid="done">ok</span>
        </div>
    )
}

describe('useStakeMutations', () => {
    const addr = '0x'.padEnd(42, 'a') as any

    beforeEach(async () => {
        vi.restoreAllMocks()

        // Restore default behavior for useEthersSigner
        const actual = await vi.importActual<typeof import('~/hooks/useEthersAdapters')>('~/hooks/useEthersAdapters')
        vi.mocked(useEthersSigner).mockImplementation(actual.useEthersSigner)

        // Spy on defaultStakingService methods, NOT the exported wrapper functions
        // This is crucial because useStakeMutations uses the defaultStakingService object directly
        vi.spyOn(svc.defaultStakingService, 'stake').mockResolvedValue({} as any)
        vi.spyOn(svc.defaultStakingService, 'initiateWithdrawal').mockResolvedValue({} as any)
        vi.spyOn(svc.defaultStakingService, 'withdraw').mockResolvedValue({} as any)
        vi.spyOn(svc.defaultStakingService, 'cancelWithdrawal').mockResolvedValue({} as any)
        vi.spyOn(svc.defaultStakingService, 'claimRewards').mockResolvedValue({} as any)
    })

    it('applies optimistic updates across all mutations without errors', async () => {
        renderWithProviders(<Comp address={addr} />)
        await act(async () => screen.getByText('seed').click())
        // stake
        await act(async () => screen.getByText('stake').click())
        // unstake
        await act(async () => screen.getByText('unstake').click())
        // withdraw
        await act(async () => screen.getByText('withdraw').click())
        // cancel
        await act(async () => screen.getByText('cancel').click())
        // claim
        await act(async () => screen.getByText('claim').click())

        await waitFor(() => expect(screen.getByTestId('done')).toBeTruthy())
    })

    it('invalidates pending withdrawal queries on withdraw', async () => {
        // Mock useEthersSigner to return a mock signer for this test only
        vi.mocked(useEthersSigner).mockReturnValue({} as any)

        const invalidateSpy = vi.fn()
        const refetchSpy = vi.fn()

        // Create QueryClient and spy on it BEFORE rendering
        const { createTestQueryClient } = await import('~/test/testUtils')
        const queryClient = createTestQueryClient()

        vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(async (...args: any[]) => {
            invalidateSpy(...args)
            return Promise.resolve()
        })
        vi.spyOn(queryClient, 'refetchQueries').mockImplementation(async (...args: any[]) => {
            refetchSpy(...args)
            return Promise.resolve()
        })

        // Render with the pre-spied QueryClient
        renderWithProviders(<Comp address={addr} />, queryClient)

        await act(async () => screen.getByText('withdraw').click())

        // Wait for the mutation to complete
        await waitFor(
            () => {
                expect(invalidateSpy).toHaveBeenCalled()
                expect(refetchSpy).toHaveBeenCalled()
            },
            { timeout: 3000 }
        )

        // Check for pending-related calls
        const hasPendingInvalidate = invalidateSpy.mock.calls.some((call) => {
            const queryKey = call[0]?.queryKey || call[0]
            return JSON.stringify(queryKey).includes('pending')
        })
        const hasPendingRefetch = refetchSpy.mock.calls.some((call) => {
            const queryKey = call[0]?.queryKey || call[0]
            return JSON.stringify(queryKey).includes('pending')
        })

        expect(hasPendingInvalidate).toBe(true)
        expect(hasPendingRefetch).toBe(true)
    })
})

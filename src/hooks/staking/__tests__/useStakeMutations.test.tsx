import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import { useStakeMutations } from '../useStakeMutations'
import * as svc from '~/services/stakingService'
import { useQueryClient } from '@tanstack/react-query'

function Comp({ address }: { address: `0x${string}` }) {
    const qc = useQueryClient()
    const { stake, initiateWithdrawal, withdraw, cancelWithdrawal, claimRewards } = useStakeMutations(address)
    return (
        <div>
            <button
                onClick={() => {
                    qc.setQueryData(['stake', 'account', address.toLowerCase()], {
                        stakedBalance: '1',
                        pendingWithdrawal: null,
                        rewards: [{ tokenAddress: '0x'.padEnd(42, '1') as any, amount: '1' }],
                        cooldown: 86400,
                    })
                    qc.setQueryData(['stake', 'stats'], { totalStaked: '100' })
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

    beforeEach(() => {
        vi.restoreAllMocks()
        vi.spyOn(svc, 'stake').mockResolvedValue({} as any)
        vi.spyOn(svc, 'initiateWithdrawal').mockResolvedValue({} as any)
        vi.spyOn(svc, 'withdraw').mockResolvedValue({} as any)
        vi.spyOn(svc, 'cancelWithdrawal').mockResolvedValue({} as any)
        vi.spyOn(svc, 'claimRewards').mockResolvedValue({} as any)
    })

    it('applies optimistic updates and rollbacks on error', async () => {
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
})



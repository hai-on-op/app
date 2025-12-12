import { describe, it, expect, vi } from 'vitest'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { useStakePendingWithdrawal } from '~/hooks/staking/useStakePendingWithdrawal'

vi.mock('@apollo/client', () => {
    return {
        gql: (lits: TemplateStringsArray) => lits[0],
        useQuery: () => ({
            data: {
                stakingUser: {
                    // Use a valid wei amount (integer string) instead of decimal
                    // 5 ETH = 5 * 10^18 wei
                    pendingWithdrawal: { amount: '5000000000000000000', timestamp: 1000 },
                },
            },
        }),
    }
})

function TestComp() {
    useStakePendingWithdrawal('kite', 'kite', '0xabc')
    return <div />
}

describe('useStakePendingWithdrawal', () => {
    it('syncs pendingWithdrawal into account cache', async () => {
        const qc = new QueryClient()
        render(
            <QueryClientProvider client={qc}>
                <TestComp />
            </QueryClientProvider>
        )
        await waitFor(() => {
            const data: any = qc.getQueryData(['stake', 'kite', 'account', '0xabc'])
            // formatEther('5000000000000000000') should return '5.0'
            expect(data?.pendingWithdrawal?.amount).toBe('5.0')
            expect(data?.pendingWithdrawal?.timestamp).toBe(1000)
        })
    })
})

import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { useStakePendingWithdrawal } from '~/hooks/staking/useStakePendingWithdrawal'

jest.mock('@apollo/client', () => {
    return {
        gql: (lits: TemplateStringsArray) => lits[0],
        useQuery: () => ({
            data: {
                stakingUser: {
                    pendingWithdrawal: { amount: '5.0', timestamp: 1000 },
                },
            },
        }),
    }
})

function TestComp({ qc }: { qc: QueryClient }) {
    useStakePendingWithdrawal('kite', 'kite', '0xabc')
    return <div />
}

describe('useStakePendingWithdrawal', () => {
    it('syncs pendingWithdrawal into account cache', async () => {
        const qc = new QueryClient()
        render(
            <QueryClientProvider client={qc}>
                <TestComp qc={qc} />
            </QueryClientProvider>
        )
        await waitFor(() => {
            const data: any = qc.getQueryData(['stake', 'kite', 'account', '0xabc'])
            expect(data?.pendingWithdrawal?.amount).toBe('5.0')
            expect(data?.pendingWithdrawal?.timestamp).toBe(1000)
        })
    })
})



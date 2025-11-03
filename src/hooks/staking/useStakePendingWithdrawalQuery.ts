import { useQuery } from '@tanstack/react-query'
import { gql } from '@apollo/client'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { client as apolloClient } from '~/utils/graphql/client'

const STAKING_USER_PW = gql`
    query GetStakingUser($id: ID!) {
        stakingUser(id: $id) {
            id
            pendingWithdrawal {
                id
                amount
                timestamp
                status
            }
        }
    }
`

export type PendingWithdrawal = { amount: string; timestamp: number } | null

export function useStakePendingWithdrawalQuery(namespace: string, address?: string) {
    const addrLower = address?.toLowerCase() || ''
    return useQuery<PendingWithdrawal>({
        queryKey: ['stake', namespace, 'pending', addrLower],
        enabled: Boolean(addrLower),
        queryFn: async () => {
            if (!addrLower) return null
            const { data } = await apolloClient.query({
                query: STAKING_USER_PW,
                variables: { id: addrLower },
                fetchPolicy: 'network-only',
            })
            const pw = data?.stakingUser?.pendingWithdrawal
            if (!pw) return null
            return {
                amount: formatEther(BigNumber.from(String(pw.amount || '0'))),
                timestamp: Number(pw.timestamp || 0),
            }
        },
    })
}



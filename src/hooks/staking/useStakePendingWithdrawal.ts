import { useEffect, useMemo } from 'react'
import { gql, useQuery as useApolloQuery } from '@apollo/client'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

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

export function useStakePendingWithdrawal(namespace: string, _poolKey: string, address?: string) {
    const qc = useQueryClient()
    const addrLower = address?.toLowerCase()
    // v1 behavior: id is just the lowercased address
    const id = useMemo(() => (addrLower ? addrLower : undefined), [addrLower])

    const { data } = useApolloQuery(STAKING_USER_PW, {
        variables: { id },
        skip: !id,
        fetchPolicy: 'network-only',
    })

    const pending = useMemo(() => {
        return data?.stakingUser?.pendingWithdrawal
            ? {
                  amount: formatEther(BigNumber.from(String(data.stakingUser.pendingWithdrawal.amount || '0'))),
                  timestamp: Number(data.stakingUser.pendingWithdrawal.timestamp || 0),
              }
            : null
    }, [data])

    useEffect(() => {
        if (!addrLower) return
        const key = ['stake', namespace, 'account', addrLower]
        qc.setQueryData(key, (prev: any) => {
            const next = prev || {}
            return {
                ...next,
                pendingWithdrawal: pending,
            }
        })
    }, [qc, namespace, addrLower, pending])

    return pending
}

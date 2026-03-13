import { useMemo } from 'react'
import { useQuery, gql } from '@apollo/client'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'

export type ScopedStakingUser = {
    id: string
    stakedBalance: string
}

type StakingUsersByIdsQuery = {
    stakingUsers: Array<{
        id: string
        stakedBalance: string
    }>
}

const STAKING_USERS_BY_IDS_QUERY = gql`
    query GetStakingUsersByIds($ids: [ID!]!) {
        stakingUsers(where: { id_in: $ids }) {
            id
            stakedBalance
        }
    }
`

function normalizeStakingUserIds(ids: Array<string | undefined | null>) {
    const uniqueIds = new Set<string>()

    ids.forEach((id) => {
        const normalized = id?.trim().toLowerCase()
        if (normalized) uniqueIds.add(normalized)
    })

    return Array.from(uniqueIds)
}

function formatStakingBalance(value: string) {
    try {
        return formatEther(BigNumber.from(value))
    } catch {
        return '0'
    }
}

export function useStakingUsersByIds(ids: Array<string | undefined | null>) {
    const normalizedIds = useMemo(() => normalizeStakingUserIds(ids), [ids])

    const { data, loading, error } = useQuery<StakingUsersByIdsQuery>(STAKING_USERS_BY_IDS_QUERY, {
        variables: { ids: normalizedIds },
        skip: normalizedIds.length === 0,
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-first',
    })

    const usersStakingData = useMemo(() => {
        return (data?.stakingUsers || []).reduce<Record<string, ScopedStakingUser>>((acc, user) => {
            const id = user.id.toLowerCase()
            acc[id] = {
                id,
                stakedBalance: formatStakingBalance(user.stakedBalance),
            }
            return acc
        }, {})
    }, [data])

    return {
        usersStakingData,
        loading,
        error,
        ids: normalizedIds,
    }
}

import { gql, useQuery as useApolloQuery } from '@apollo/client'
import type { Address } from '~/services/stakingService'

const STAKING_USER_QUERY = gql`
    query GetStakingUser($id: ID!) {
        stakingUser(id: $id) {
            stakingPositions {
                id
                amount
                timestamp
                type
                transactionHash
            }
            rewards {
                id
                rewardToken
                amount
                destination
                timestamp
                transactionHash
            }
        }
    }
`

export function useStakeHistory(address?: Address) {
    const id = address?.toLowerCase() || ''
    // Using apollo directly since it already exists in app; optional and isolated
    const { data, loading, error, refetch } = useApolloQuery(STAKING_USER_QUERY, {
        variables: { id },
        skip: !id,
        fetchPolicy: 'network-only',
    })

    return {
        data: data?.stakingUser || null,
        loading,
        error,
        refetch,
    }
}

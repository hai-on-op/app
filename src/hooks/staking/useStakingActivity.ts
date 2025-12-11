import { useQuery } from '@tanstack/react-query'
import { gql } from '@apollo/client'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { useAccount } from 'wagmi'
import { client as apolloClient } from '~/utils/graphql/client'
import type { StakingConfig, StakingUserEntity } from '~/types/stakingConfig'
import { useStakingData } from '~/hooks/useStakingData'

export type StakingPosition = {
    id: string
    amount: string
    timestamp: number
    type: 'STAKE' | 'INITIATE_WITHDRAWAL' | 'CANCEL_WITHDRAWAL' | 'WITHDRAW'
    transactionHash: string
}

type StakingUserQueryResult = {
    stakingUser?: { stakingPositions: RawPosition[] } | null
    haiBoldCurveLPStakingUser?: { stakingPositions: RawPosition[] } | null
    haiVeloVeloLPStakingUser?: { stakingPositions: RawPosition[] } | null
}

type RawPosition = {
    id: string
    amount: string
    timestamp: string
    type: string
    transactionHash: string
}

const STAKING_POSITIONS_FIELDS = `
    id
    stakingPositions {
        id
        amount
        timestamp
        type
        transactionHash
    }
`

const STAKING_ACTIVITY_QUERIES: Record<StakingUserEntity, ReturnType<typeof gql>> = {
    stakingUser: gql`
        query GetStakingUserActivity($id: ID!) {
            stakingUser(id: $id) {
                ${STAKING_POSITIONS_FIELDS}
            }
        }
    `,
    haiBoldCurveLPStakingUser: gql`
        query GetHaiBoldCurveLPStakingUserActivity($id: ID!) {
            haiBoldCurveLPStakingUser(id: $id) {
                ${STAKING_POSITIONS_FIELDS}
            }
        }
    `,
    haiVeloVeloLPStakingUser: gql`
        query GetHaiVeloVeloLPStakingUserActivity($id: ID!) {
            haiVeloVeloLPStakingUser(id: $id) {
                ${STAKING_POSITIONS_FIELDS}
            }
        }
    `,
}

const STAKING_USER_ROOT_FIELD: Record<StakingUserEntity, keyof StakingUserQueryResult> = {
    stakingUser: 'stakingUser',
    haiBoldCurveLPStakingUser: 'haiBoldCurveLPStakingUser',
    haiVeloVeloLPStakingUser: 'haiVeloVeloLPStakingUser',
}

function formatPosition(pos: RawPosition): StakingPosition {
    return {
        id: pos.id,
        amount: formatEther(BigNumber.from(pos.amount || '0')),
        timestamp: Number(pos.timestamp),
        type: pos.type as StakingPosition['type'],
        transactionHash: pos.transactionHash,
    }
}

/**
 * Hook to fetch staking activity (positions) based on config.
 * If no config is provided, falls back to the default StakingProvider data.
 */
export function useStakingActivity(config?: StakingConfig) {
    const { address } = useAccount()
    const defaultStakingData = useStakingData()

    const userEntity: StakingUserEntity = config?.subgraph.userEntity ?? 'stakingUser'
    const idForUser = config?.subgraph.idForUser ?? ((a: string) => a.toLowerCase())

    const query = useQuery<StakingPosition[]>({
        queryKey: ['staking', 'activity', config?.namespace ?? 'kite', address?.toLowerCase()],
        enabled: Boolean(address) && Boolean(config),
        queryFn: async () => {
            if (!address) return []

            const id = idForUser(address.toLowerCase())

            const { data } = await apolloClient.query<StakingUserQueryResult>({
                query: STAKING_ACTIVITY_QUERIES[userEntity],
                variables: { id },
                fetchPolicy: 'network-only',
            })

            const rootField = STAKING_USER_ROOT_FIELD[userEntity]
            const stakingUser = data?.[rootField]
            const positions = stakingUser?.stakingPositions ?? []

            return positions.map(formatPosition)
        },
    })

    // If no config is provided, use the default StakingProvider data
    if (!config) {
        return {
            positions: defaultStakingData?.stakingData.stakingPositions ?? [],
            loading: defaultStakingData?.loading ?? false,
        }
    }

    return {
        positions: query.data ?? [],
        loading: query.isLoading,
    }
}


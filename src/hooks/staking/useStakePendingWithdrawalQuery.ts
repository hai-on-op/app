import { useQuery } from '@tanstack/react-query'
import { gql } from '@apollo/client'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { client as apolloClient } from '~/utils/graphql/client'
import type { StakingUserEntity } from '~/types/stakingConfig'
import { stakeQueryKeys } from '~/hooks/staking/stakeQueryKeys'

type RawPendingWithdrawal = {
    amount?: string | number
    timestamp?: string | number
    status?: string
}

type StakingUserQueryResult = {
    stakingUser?: {
        id: string
        pendingWithdrawal?: RawPendingWithdrawal | null
    } | null
    haiBoldCurveLPStakingUser?: {
        id: string
        pendingWithdrawal?: RawPendingWithdrawal | null
    } | null
    haiVeloVeloLPStakingUser?: {
        id: string
        pendingWithdrawal?: RawPendingWithdrawal | null
    } | null
}

const STAKING_USER_FIELDS = `
    id
    pendingWithdrawal {
        id
        amount
        timestamp
        status
    }
`

const STAKING_USER_QUERIES: Record<StakingUserEntity, ReturnType<typeof gql>> = {
    stakingUser: gql`
        query GetStakingUser($id: ID!) {
            stakingUser(id: $id) {
                ${STAKING_USER_FIELDS}
            }
        }
    `,
    haiBoldCurveLPStakingUser: gql`
        query GetHaiBoldCurveLPStakingUser($id: ID!) {
            haiBoldCurveLPStakingUser(id: $id) {
                ${STAKING_USER_FIELDS}
            }
        }
    `,
    haiVeloVeloLPStakingUser: gql`
        query GetHaiVeloVeloLPStakingUser($id: ID!) {
            haiVeloVeloLPStakingUser(id: $id) {
                ${STAKING_USER_FIELDS}
            }
        }
    `,
}

const STAKING_USER_ROOT_FIELD: Record<StakingUserEntity, keyof StakingUserQueryResult> = {
    stakingUser: 'stakingUser',
    haiBoldCurveLPStakingUser: 'haiBoldCurveLPStakingUser',
    haiVeloVeloLPStakingUser: 'haiVeloVeloLPStakingUser',
}

export type PendingWithdrawal = { amount: string; timestamp: number } | null

type UseStakePendingWithdrawalOptions = {
    userEntity?: StakingUserEntity
    idForUser?: (address: string) => string
}

export function useStakePendingWithdrawalQuery(
    namespace: string,
    address?: string,
    options?: UseStakePendingWithdrawalOptions
) {
    const userEntity: StakingUserEntity = options?.userEntity ?? 'stakingUser'

    return useQuery<PendingWithdrawal>({
        queryKey: stakeQueryKeys.pendingForAddressAndEntity(namespace, address, userEntity),
        enabled: Boolean(address),
        queryFn: async () => {
            const addrLower = address?.toLowerCase()
            if (!addrLower) return null

            const id = options?.idForUser ? options.idForUser(addrLower) : addrLower

            const { data } = await apolloClient.query<StakingUserQueryResult>({
                query: STAKING_USER_QUERIES[userEntity],
                variables: { id },
                fetchPolicy: 'network-only',
            })

            const rootField = STAKING_USER_ROOT_FIELD[userEntity]
            const stakingUser = data?.[rootField]
            const pw = stakingUser?.pendingWithdrawal

            if (!pw) return null

            return {
                amount: formatEther(BigNumber.from(String(pw.amount ?? '0'))),
                timestamp: Number(pw.timestamp ?? 0),
            }
        },
    })
}

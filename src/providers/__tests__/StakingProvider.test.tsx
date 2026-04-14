import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useAccountMock, useQueryMock, useStoreActionsMock, useStoreStateMock } = vi.hoisted(() => ({
    useAccountMock: vi.fn(),
    useQueryMock: vi.fn(),
    useStoreActionsMock: vi.fn(),
    useStoreStateMock: vi.fn(),
}))

vi.mock('@apollo/client', () => ({
    gql: (strings: TemplateStringsArray) => strings[0],
    useQuery: useQueryMock,
}))

vi.mock('wagmi', () => ({
    useAccount: useAccountMock,
}))

vi.mock('~/store', () => ({
    useStoreActions: useStoreActionsMock,
    useStoreState: useStoreStateMock,
}))

vi.mock('~/hooks', () => ({
    useEthersSigner: () => null,
    usePublicProvider: () => null,
}))

import { StakingProvider, useStaking } from '../StakingProvider'

const baseState = {
    stakingModel: {
        cooldownPeriod: '0',
        totalStaked: '0',
        userRewards: [],
        stakingApyData: [],
        stakedBalance: '0',
        usersStakingData: {},
        pendingWithdrawals: {},
    },
}

const baseActions = {
    stakingModel: {
        setPendingWithdrawals: vi.fn(),
        setUsersStakingData: vi.fn(),
        fetchCooldownPeriod: vi.fn(),
        fetchUserRewards: vi.fn(),
        fetchStakingApyData: vi.fn(),
        fetchTotalStaked: vi.fn(),
        fetchUserStakedBalance: vi.fn(),
    },
}

function Probe() {
    const staking = useStaking()
    return (
        <div data-testid="pending">
            {staking?.stakingData.pendingWithdrawal?.amount || 'none'}|
            {staking?.stakingData.pendingWithdrawal?.status || 'none'}
        </div>
    )
}

describe('StakingProvider query policy', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        useAccountMock.mockReturnValue({ address: undefined })
        useStoreStateMock.mockImplementation((selector: (state: typeof baseState) => unknown) => selector(baseState))
        useStoreActionsMock.mockImplementation((selector: (actions: typeof baseActions) => unknown) =>
            selector(baseActions)
        )
        useQueryMock.mockReturnValue({
            data: undefined,
            loading: false,
            refetch: vi.fn(),
        })
    })

    it('skips the account query and full users index in lightweight mode', () => {
        render(
            <StakingProvider>
                <div />
            </StakingProvider>
        )

        expect(useQueryMock).toHaveBeenCalledTimes(3)
        expect(useQueryMock.mock.calls[0][1]).toMatchObject({
            skip: true,
            fetchPolicy: 'cache-first',
            nextFetchPolicy: 'cache-first',
        })
        expect(useQueryMock.mock.calls[1][1]).toMatchObject({
            skip: true,
            fetchPolicy: 'cache-first',
            nextFetchPolicy: 'cache-first',
        })
        expect(useQueryMock.mock.calls[2][1]).toMatchObject({
            fetchPolicy: 'cache-first',
            nextFetchPolicy: 'cache-first',
        })
    })

    it('loads the users index only when explicitly requested', () => {
        useAccountMock.mockReturnValue({ address: '0xAbcdefabcdefabcdefabcdefabcdefabcdefabcd' })

        render(
            <StakingProvider loadUsersIndex>
                <div />
            </StakingProvider>
        )

        expect(useQueryMock).toHaveBeenCalledTimes(3)
        expect(useQueryMock.mock.calls[0][1]).toMatchObject({
            skip: false,
            variables: { id: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' },
            fetchPolicy: 'cache-first',
            nextFetchPolicy: 'cache-first',
        })
        expect(useQueryMock.mock.calls[1][1]).toMatchObject({
            skip: false,
            fetchPolicy: 'cache-first',
            nextFetchPolicy: 'cache-first',
        })
    })

    it('falls back to the account query for pending withdrawals in lightweight mode', () => {
        useAccountMock.mockReturnValue({ address: '0xAbcdefabcdefabcdefabcdefabcdefabcdefabcd' })
        useQueryMock
            .mockReturnValueOnce({
                data: {
                    stakingUser: {
                        stakedBalance: '1000000000000000000',
                        totalWithdrawn: '0',
                        stakingPositions: [],
                        rewards: [],
                        pendingWithdrawal: {
                            id: 'pending-1',
                            amount: '250000000000000000',
                            timestamp: '1700000000',
                            status: 'PENDING',
                        },
                    },
                },
                loading: false,
                refetch: vi.fn(),
            })
            .mockReturnValueOnce({
                data: undefined,
                loading: false,
                refetch: vi.fn(),
            })
            .mockReturnValueOnce({
                data: undefined,
                loading: false,
                refetch: vi.fn(),
            })

        render(
            <StakingProvider>
                <Probe />
            </StakingProvider>
        )

        expect(screen.getByTestId('pending').textContent).toBe('0.25|PENDING')
    })
})

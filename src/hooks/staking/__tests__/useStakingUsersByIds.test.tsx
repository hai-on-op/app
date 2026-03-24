import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const { useQueryMock } = vi.hoisted(() => ({
    useQueryMock: vi.fn(() => ({
        data: { stakingUsers: [] },
        loading: false,
        error: undefined,
    })),
}))

vi.mock('@apollo/client', () => ({
    gql: (lits: TemplateStringsArray) => lits[0],
    useQuery: useQueryMock,
}))

import { useStakingUsersByIds } from '~/hooks/staking/useStakingUsersByIds'

function TestComponent({ ids }: { ids: Array<string | undefined | null> }) {
    const query = useStakingUsersByIds(ids)

    return <div data-testid="ids">{query.ids.join(',')}</div>
}

describe('useStakingUsersByIds', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        useQueryMock.mockClear()
    })

    afterEach(() => {
        vi.runOnlyPendingTimers()
        vi.useRealTimers()
    })

    it('waits for the ids list to settle before querying', () => {
        const { rerender } = render(<TestComponent ids={['0xaaa']} />)

        expect(useQueryMock).toHaveBeenLastCalledWith(
            expect.anything(),
            expect.objectContaining({
                skip: true,
                variables: { ids: [] },
            })
        )
        expect(screen.getByTestId('ids').textContent).toBe('')

        rerender(<TestComponent ids={['0xaaa', '0xbbb', '0xaaa']} />)

        expect(useQueryMock).toHaveBeenLastCalledWith(
            expect.anything(),
            expect.objectContaining({
                skip: true,
                variables: { ids: [] },
            })
        )

        vi.advanceTimersByTime(250)

        expect(useQueryMock).toHaveBeenLastCalledWith(
            expect.anything(),
            expect.objectContaining({
                skip: false,
                variables: { ids: ['0xaaa', '0xbbb'] },
                fetchPolicy: 'cache-first',
            })
        )
        expect(screen.getByTestId('ids').textContent).toBe('0xaaa,0xbbb')
    })
})

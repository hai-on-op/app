import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { useEarnStrategiesMock } = vi.hoisted(() => ({
    useEarnStrategiesMock: vi.fn(),
}))

vi.mock('~/hooks/useEarnStrategies', () => ({
    useEarnStrategies: () => useEarnStrategiesMock(),
}))

import { EarnProvider, useEarnContext } from '../EarnProvider'

function Consumer({ label }: { label: string }) {
    const { netBoostValue, rows } = useEarnContext()

    return <div data-testid={label}>{`${netBoostValue}:${rows.length}`}</div>
}

describe('EarnProvider', () => {
    it('computes the earn strategy state once and shares it with consumers', () => {
        useEarnStrategiesMock.mockReturnValue({
            netBoostValue: 1.75,
            rows: [{ id: 'a' }, { id: 'b' }],
        })

        render(
            <EarnProvider>
                <Consumer label="first" />
                <Consumer label="second" />
            </EarnProvider>
        )

        expect(useEarnStrategiesMock).toHaveBeenCalledTimes(1)
        expect(screen.getByTestId('first').textContent).toBe('1.75:2')
        expect(screen.getByTestId('second').textContent).toBe('1.75:2')
    })
})

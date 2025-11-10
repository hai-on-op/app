import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('~/containers/Stake/StakingExperience', () => {
    return {
        StakingExperience: ({ config }: any) => (
            <div data-testid="staking-experience">{config?.namespace}</div>
        ),
    }
})

import HaiBoldCurveLpStakePage from '~/containers/Stake/HaiBoldCurveLpStakePage'

describe('HaiBoldCurveLpStakePage', () => {
    it('renders StakingExperience with the correct config namespace', () => {
        render(<HaiBoldCurveLpStakePage />)
        const el = screen.getByTestId('staking-experience')
        expect(el).toBeTruthy()
        expect(el.textContent).toBe('lp-hai-bold-curve')
    })
})



import { screen } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import { StakingExperience } from '~/containers/Stake/StakingExperience'
import { kiteConfig } from '~/staking/configs/kite'
import { exampleLpConfig } from '~/staking/configs/exampleLp'
import { haiVeloVeloLpConfig } from '~/staking/configs/haiVeloVeloLp'

describe('StakingExperience labels', () => {
    it('renders KITE copy', () => {
        renderWithProviders(<StakingExperience config={kiteConfig} />)
        expect(screen.getByText('Manage KITE Staking')).toBeTruthy()
        expect(screen.getByText('My stKITE Share')).toBeTruthy()
        expect(screen.getByText('My Boost:')).toBeTruthy()
    })

    it('renders LP copy and hides boost surfaces', () => {
        renderWithProviders(<StakingExperience config={exampleLpConfig} />)
        expect(screen.getByText('Manage HAI/OP LP Staking')).toBeTruthy()
        expect(screen.queryByText('My Net Boost:')).not.toBeTruthy()
    })

    it('renders haiVELOVELO LP copy and shows boost surfaces', () => {
        renderWithProviders(<StakingExperience config={haiVeloVeloLpConfig} />)
        expect(screen.getByText('Manage haiVELO/VELO LP Staking')).toBeTruthy()
        expect(screen.getByText('My Boost:')).toBeTruthy()
    })
})

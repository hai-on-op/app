import { screen } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import { StakingExperience } from '~/containers/Stake/StakingExperience'
import { kiteConfig } from '~/staking/configs/kite'
import { exampleLpConfig } from '~/staking/configs/exampleLp'
import { haiVeloVeloLpConfig } from '~/staking/configs/haiVeloVeloLp'

describe('StakingExperience labels', () => {
    it('renders KITE copy', () => {
        renderWithProviders(<StakingExperience config={kiteConfig} />)
        expect(screen.getByText('Manage KITE Staking')).toBeInTheDocument()
        expect(screen.getByText('My stKITE Share')).toBeInTheDocument()
        expect(screen.getByText('My Net Boost:')).toBeInTheDocument()
    })

    it('renders LP copy and hides boost surfaces', () => {
        renderWithProviders(<StakingExperience config={exampleLpConfig} />)
        expect(screen.getByText('Manage HAI/OP LP Staking')).toBeInTheDocument()
        expect(screen.queryByText('My Net Boost:')).not.toBeInTheDocument()
    })

    it('renders haiVELOVELO LP copy and shows boost surfaces', () => {
        renderWithProviders(<StakingExperience config={haiVeloVeloLpConfig} />)
        expect(screen.getByText('Manage HAI/VELO LP Staking')).toBeInTheDocument()
        expect(screen.getByText('My Net Boost:')).toBeInTheDocument()
    })
})

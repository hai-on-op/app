import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { renderWithProviders } from '~/test/testUtils'
import { StakingExperience } from '~/containers/Stake/StakingExperience'
import { StakingActivityTable } from '~/containers/Stake/StakingActivityTable'
import { NETWORK_ID, getEtherscanLink } from '~/utils'
import { kiteConfig } from '~/staking/configs/kite'
import { exampleLpConfig } from '~/staking/configs/exampleLp'
import { haiVeloVeloLpConfig } from '~/staking/configs/haiVeloVeloLp'

afterEach(cleanup)

vi.mock('~/apr/AprProvider', () => ({
    useApr: () => ({
        getStrategy: () => undefined,
    }),
}))

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

describe('staking activity', () => {
    it('shows the empty state when opening Activity without a connected wallet', () => {
        renderWithProviders(<StakingExperience config={kiteConfig} />)
        fireEvent.click(screen.getByText('Activity'))
        expect(screen.getByText('No staking activity to display.')).toBeTruthy()
    })

    it('sorts by the selected column without mutating positions', () => {
        const positions = [
            { type: 'WITHDRAW', timestamp: 1, amount: '10', transactionHash: '0x01' },
            { type: 'STAKE', timestamp: 3, amount: '1', transactionHash: '0x02' },
            { type: 'INITIATE_WITHDRAWAL', timestamp: 2, amount: '2', transactionHash: '0x03' },
        ]
        renderWithProviders(<StakingActivityTable positions={positions} />)
        const hashes = () => screen.getAllByRole('link').map((link) => link.getAttribute('href')?.split('/').pop())
        expect(hashes()).toEqual(['0x02', '0x03', '0x01'])
        expect(screen.getAllByRole('link')[0].getAttribute('href')).toBe(
            getEtherscanLink(NETWORK_ID, '0x02', 'transaction')
        )

        fireEvent.click(screen.getAllByText('Time')[0])
        expect(hashes()).toEqual(['0x01', '0x03', '0x02'])
        fireEvent.click(screen.getAllByText('Amount')[0])
        expect(hashes()).toEqual(['0x01', '0x03', '0x02'])
        fireEvent.click(screen.getAllByText('Amount')[0])
        expect(hashes()).toEqual(['0x02', '0x03', '0x01'])
        fireEvent.click(screen.getAllByText('Action')[0])
        expect(hashes()).toEqual(['0x01', '0x02', '0x03'])
        expect(positions.map(({ transactionHash }) => transactionHash)).toEqual(['0x01', '0x02', '0x03'])
    })
})

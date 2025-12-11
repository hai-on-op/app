import { screen } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import { Confirm } from '../Confirm'

const lpConfig = {
    namespace: 'lp-demo',
    labels: { token: 'HAI/OP LP', stakeVerb: 'Stake' },
    addresses: { stakeToken: '0x0', manager: '0x0' },
    decimals: 18,
    affectsBoost: false,
    subgraph: { poolKey: 'lp-demo', userEntity: 'stakingUser', statsEntity: 'stakingStatistic', idForUser: (a: string) => a, idForStats: () => 'lp-demo' },
    rewards: { async getClaims() { return [] } },
} as any

describe('Confirm modal boost gating', () => {
    it('hides Net Boost row when affectsBoost=false', () => {
        renderWithProviders(
            <Confirm
                isStaking
                amount={''}
                stakedAmount={'0'}
                isWithdraw={false}
                config={lpConfig}
            />
        )
        expect(screen.queryByText('Net Boost')).not.toBeInTheDocument()
    })
})



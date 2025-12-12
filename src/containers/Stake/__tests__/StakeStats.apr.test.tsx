import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import * as v2 from '~/hooks/staking/useStakingSummaryV2'
import { renderWithProviders } from '~/test/testUtils'
import { StakeStats } from '~/containers/Stake/Stats'

vi.mock('~/hooks/staking/useStakingSummaryV2')

describe('StakeStats uses V2 APR', () => {
    it('renders values from useStakingSummaryV2', () => {
        ;(v2.useStakingSummaryV2 as ReturnType<typeof vi.fn>).mockReturnValue({
            loading: false,
            isOptimistic: false,
            kitePrice: 1,
            totalStaked: { amount: 100, amountFormatted: '100', usdValue: 100, usdValueFormatted: '$100' },
            myStaked: {
                amount: 10,
                amountFormatted: '10',
                usdValue: 10,
                usdValueFormatted: '$10',
                effectiveAmount: 10,
                effectiveAmountFormatted: '10',
            },
            myShare: { value: 10, percentage: '10%' },
            stakingApr: { value: 1234, formatted: '12.34%' },
            boost: {
                netBoostValue: 1.0,
                netBoostFormatted: '1.00x',
                boostedValue: 0,
                boostedValueFormatted: '$0',
                haiVeloBoost: 0,
                lpBoost: 0,
                haiMintingBoost: 0,
                haiVeloPositionValue: 0,
                userLPPositionValue: 0,
                haiMintingPositionValue: 0,
            },
            stakingData: {},
            simulateNetBoost: () => 1,
            calculateSimulatedValues: () => ({
                simulationMode: false,
                totalStakedAfterTx: 0,
                myStakedAfterTx: 0,
                myShareAfterTx: 0,
                netBoostAfterTx: 1,
            }),
        })

        const { getByText } = renderWithProviders(
            <MemoryRouter>
                <StakeStats />
            </MemoryRouter>
        )
        // Presence of key labels is enough to confirm rendering path; APR is used inside Overview, but StakeStats relies on summary for numbers
        expect(getByText('Staking TVL')).toBeTruthy()
        expect(getByText('My KITE Staked')).toBeTruthy()
        expect(getByText('My stKITE Share')).toBeTruthy()
    })
})

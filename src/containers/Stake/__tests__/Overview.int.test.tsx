import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import * as flags from 'flagsmith/react'
import { Overview } from '../Manage/Overview'
import * as sumV2 from '~/hooks/staking/useStakingSummaryV2'

describe('Overview (integration, v2)', () => {
    it('renders formatted stats with simulation when flag is on', async () => {
        vi.spyOn(flags, 'useFlags').mockReturnValue({ staking_refactor: { enabled: true } } as any)
        vi.spyOn(sumV2, 'useStakingSummaryV2').mockReturnValue({
            loading: false,
            isOptimistic: false,
            kitePrice: 2,
            totalStaked: { amount: 100, amountFormatted: '100', usdValue: 200, usdValueFormatted: '$200' },
            myStaked: {
                amount: 10,
                amountFormatted: '10',
                usdValue: 20,
                usdValueFormatted: '$20',
                effectiveAmount: 8,
                effectiveAmountFormatted: '8',
            },
            myShare: { value: 8, percentage: '8%' },
            stakingApr: { value: 1234, formatted: '12.34%' },
            boost: {
                netBoostValue: 1.23,
                netBoostFormatted: '1.23x',
                boostedValue: 16,
                boostedValueFormatted: '$16',
                haiVeloBoost: 1,
                lpBoost: 1,
                haiMintingBoost: 1,
                haiVeloPositionValue: 0,
                userLPPositionValue: 0,
                haiMintingPositionValue: 0,
            },
            stakingData: {},
            simulateNetBoost: () => 1.23,
            calculateSimulatedValues: (s: string, u: string) => ({
                simulationMode: Boolean(Number(s) || Number(u)),
                totalStakedAfterTx: 101,
                myStakedAfterTx: 9,
                myShareAfterTx: 9,
                netBoostAfterTx: 1.25,
            }),
        } as any)

        renderWithProviders(
            <Overview
                simulation={{
                    stakingAmount: '1',
                    unstakingAmount: '',
                    setStakingAmount: () => {},
                    setUnstakingAmount: () => {},
                }}
            />
        )

        await waitFor(() => {
            expect(Boolean(screen.getByText('Staking Overview'))).toBe(true)
            expect(Boolean(screen.getByText('12.34%'))).toBe(true)
            expect(screen.getAllByText('$20').length).toBeGreaterThan(0)
        })
    })
})

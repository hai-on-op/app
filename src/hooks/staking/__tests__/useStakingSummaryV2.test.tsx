import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import * as statsHook from '../useStakeStats'
import * as accountHook from '../useStakeAccount'
import * as aprHook from '../useStakeApr'
import * as pricesHook from '../useStakePrices'
import * as effHook from '../useStakeEffectiveBalance'
import * as shareHook from '../useStakeShare'
import * as boostHook from '~/hooks/useBoost'
import { useStakingSummaryV2 } from '../useStakingSummaryV2'

function Comp({ address }: { address: `0x${string}` }) {
    const summary = useStakingSummaryV2(address)
    if (summary.loading) return <div>loading</div>
    return (
        <div>
            <div data-testid="total">{summary.totalStaked.amountFormatted}</div>
            <div data-testid="mine">{summary.myStaked.amountFormatted}</div>
            <div data-testid="apr">{summary.stakingApr.formatted}</div>
            <div data-testid="share">{summary.myShare.percentage}</div>
        </div>
    )
}

describe('useStakingSummaryV2', () => {
    it('composes values and simulates correctly', async () => {
        vi.spyOn(statsHook, 'useStakeStats').mockReturnValue({ data: { totalStaked: '100' }, isLoading: false } as any)
        vi.spyOn(accountHook, 'useStakeAccount').mockReturnValue({ data: { stakedBalance: '10' }, isLoading: false } as any)
        vi.spyOn(aprHook, 'useStakeApr').mockReturnValue({ loading: false, value: 1234, formatted: '12.34%' } as any)
        vi.spyOn(pricesHook, 'useStakePrices').mockReturnValue({ data: { kitePrice: 2, haiPrice: 1, opPrice: 1 }, loading: false } as any)
        vi.spyOn(effHook, 'useStakeEffectiveBalance').mockReturnValue({ loading: false, value: 8 } as any)
        vi.spyOn(shareHook, 'useStakeShare').mockReturnValue({ loading: false, value: 8, percentage: '8%' } as any)
        vi.spyOn(boostHook, 'useBoost').mockReturnValue({
            userLPPositionValue: 0,
            lpBoostValue: 1,
            userTotalValue: 16,
            hvBoost: 1,
            haiMintingBoost: 1,
            haiMintingPositionValue: 0,
            simulateNetBoost: (u: number, t: number) => 1.23,
            netBoostValue: 1.23,
            haiVeloPositionValue: 0,
            loading: false,
        } as any)

        renderWithProviders(<Comp address={'0x'.padEnd(42, 'a') as any} />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('total').textContent).toBe('100')
        expect(screen.getByTestId('mine').textContent).toBe('10')
        expect(screen.getByTestId('apr').textContent).toBe('12.34%')
        expect(screen.getByTestId('share').textContent).toBe('8%')
    })
})



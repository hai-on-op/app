import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import { useLpBoostForUser } from '../useLpBoostForUser'
import * as poolHook from '../useLpPool'
import * as liqHook from '../useLpUserTotalLiquidity'
import * as stakeAccountHook from '~/hooks/staking/useStakeAccount'
import * as stakeStatsHook from '~/hooks/staking/useStakeStats'
import * as boostService from '~/services/boostService'

function Comp({ address }: { address: `0x${string}` }) {
    const { loading, lpBoost, kiteRatio } = useLpBoostForUser(address)
    if (loading) return <div>loading</div>
    return (
        <div>
            <div data-testid="boost">{lpBoost}</div>
            <div data-testid="ratio">{kiteRatio}</div>
        </div>
    )
}

describe('useLpBoostForUser', () => {
    beforeEach(() => vi.resetAllMocks())
    afterEach(() => vi.restoreAllMocks())

    it('computes boost and ratio from inputs', async () => {
        vi.spyOn(poolHook, 'useLpPool').mockReturnValue({ data: { liquidity: '100' }, isLoading: false } as any)
        vi.spyOn(liqHook, 'useLpUserTotalLiquidity').mockReturnValue({ loading: false, value: '10' } as any)
        vi.spyOn(stakeAccountHook, 'useStakeAccount').mockReturnValue({ data: { stakedBalance: '25' }, isLoading: false } as any)
        vi.spyOn(stakeStatsHook, 'useStakeStats').mockReturnValue({ data: { totalStaked: '100' }, isLoading: false } as any)
        vi.spyOn(boostService, 'calculateLPBoost').mockReturnValue({ lpBoost: 1.5, kiteRatio: 0.25 } as any)

        renderWithProviders(<Comp address={'0x'.padEnd(42, 'a') as any} />)
        await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
        expect(screen.getByTestId('boost').textContent).toBe('1.5')
        expect(screen.getByTestId('ratio').textContent).toBe('0.25')
    })
})



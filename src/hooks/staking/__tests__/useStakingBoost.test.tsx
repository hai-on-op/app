import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '~/test/testUtils'
import { useStakingBoost } from '../useStakingBoost'
import * as boostHook from '~/hooks/useBoost'
import * as stakeAccountHook from '../useStakeAccount'
import * as stakeStatsHook from '../useStakeStats'
import * as boostService from '~/services/boostService'
import { kiteConfig } from '~/staking/configs/kite'
import { haiVeloVeloLpConfig } from '~/staking/configs/haiVeloVeloLp'
import * as wagmi from 'wagmi'

function Comp({ config }: { config?: any }) {
    const { netBoostValue, lpBoostValue } = useStakingBoost(config)
    return (
        <div>
            <div data-testid="net">{netBoostValue}</div>
            <div data-testid="lp">{lpBoostValue}</div>
        </div>
    )
}

describe('useStakingBoost', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('delegates to useBoost for KITE staking', async () => {
        vi.spyOn(boostHook, 'useBoost').mockReturnValue({
            userLPPositionValue: 0,
            lpBoostValue: 1.5,
            userTotalValue: 100,
            hvBoost: 1.2,
            haiMintingBoost: 1.1,
            haiMintingPositionValue: 50,
            simulateNetBoost: () => 1.7,
            netBoostValue: 1.7,
            haiVeloPositionValue: 30,
            loading: false,
        } as any)

        renderWithProviders(<Comp config={kiteConfig} />)

        await waitFor(() => {
            expect(screen.getByTestId('net').textContent).toBe('1.7')
            expect(screen.getByTestId('lp').textContent).toBe('1.5')
        })
    })

    it('computes LP boost for LP staking configs using calculateLPBoost', async () => {
        vi.spyOn(wagmi, 'useAccount').mockReturnValue({ address: '0x'.padEnd(42, 'a') } as any)

        vi.spyOn(stakeAccountHook, 'useStakeAccount').mockImplementation((_addr: any, namespace: string) => {
            if (namespace === kiteConfig.namespace) {
                return { data: { stakedBalance: '25' }, isLoading: false } as any
            }
            return { data: { stakedBalance: '10' }, isLoading: false } as any
        })

        vi.spyOn(stakeStatsHook, 'useStakeStats').mockImplementation((namespace: string) => {
            if (namespace === kiteConfig.namespace) {
                return { data: { totalStaked: '100' }, isLoading: false } as any
            }
            return { data: { totalStaked: '40' }, isLoading: false } as any
        })

        vi.spyOn(boostService, 'calculateLPBoost').mockReturnValue({ lpBoost: 1.8, kiteRatio: 0.25 } as any)

        renderWithProviders(<Comp config={haiVeloVeloLpConfig} />)

        await waitFor(() => {
            expect(screen.getByTestId('net').textContent).toBe('1.8')
            expect(screen.getByTestId('lp').textContent).toBe('1.8')
        })
    })
}



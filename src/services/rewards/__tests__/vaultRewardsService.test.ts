import { describe, it, expect } from 'vitest'
import { getVaultSchedule, computeVaultApr } from '../vaultRewardsService'

describe('vaultRewardsService.getVaultSchedule', () => {
    it.each(['ALETH', 'YV-VELO-ALETH-WETH'])('returns no schedule entries for %s', (collateral) => {
        expect(getVaultSchedule(collateral)).toEqual([])
    })

    it('returns the configured haiAERO minting reward', () => {
        expect(getVaultSchedule('HAIAERO')).toEqual([{ token: 'KITE', dailyAmount: 50 }])
    })
})

describe('vaultRewardsService.computeVaultApr', () => {
    it('returns 0 when TVL is zero', () => {
        const apr = computeVaultApr({ schedule: [{ token: 'KITE', dailyAmount: 50 }], totalBoostedValueUsd: 0 })
        expect(apr).toBe(0)
    })
    it('computes APR percentage given schedule and TVL', () => {
        const apr = computeVaultApr({ schedule: [{ token: 'KITE', dailyAmount: 100 }], totalBoostedValueUsd: 10000 })
        // 100/10000 * 365 * 100 = 365%
        expect(Math.round(apr)).toBe(365)
    })
})

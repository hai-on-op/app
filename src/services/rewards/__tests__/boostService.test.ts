import { describe, it, expect } from 'vitest'
import { computeHaiVeloBoostApr, computeVaultBoostApr } from '../boostService'

describe('boostService.computeHaiVeloBoostApr', () => {
    it('computes base and boosted APR', () => {
        const res = computeHaiVeloBoostApr({
            mapping: { '0xme': 100, '0xyou': 100 },
            boostMap: { '0xme': 2, '0xyou': 1 },
            haiVeloPriceUsd: 1,
            haiPriceUsd: 1,
            latestTransferAmount: 700, // 100/day
            userAddress: '0xme',
        })
        // totalBoostedQty = 100*2 + 100*1 = 300; value=300*1
        // baseAPR = (100/300) * 365 * 100 = ~121.67%
        expect(res.baseAprPct).toBeGreaterThan(100)
        expect(res.myBoost).toBe(2)
        expect(res.myBoostedAprPct).toBeCloseTo(res.baseAprPct * 2)
        expect(res.totals.boostedValueUsd).toBe(300)
    })
})

describe('boostService.computeVaultBoostApr', () => {
    it('computes base APR and boosted APR for vault mapping', () => {
        const res = computeVaultBoostApr({
            userDebtMapping: { '0xme': 50, '0xyou': 50 },
            boostMap: { '0xme': 3, '0xyou': 1 },
            dailyRewardsUsd: 10,
            userAddress: '0xme',
        })
        // totalBoostedQty = 50*3 + 50*1 = 200; tvlUsd assumed equal to qty
        // baseAPR = (10/200) * 365 * 100 = 182.5%
        expect(res.baseAprPct).toBeCloseTo((10 / 200) * 365 * 100)
        expect(res.myBoost).toBe(3)
        expect(res.myBoostedAprPct).toBeCloseTo(res.baseAprPct * 3)
    })
})



import { describe, expect, it } from 'vitest'

import { calculatePoolTVL, calculateTokenPrice } from './priceCalculations'

const prices = {
    HAI: {
        raw: '0.000128',
        toString: () => '0.000128',
    },
    ALETH: {
        raw: '650',
        toString: () => '650',
    },
}

describe('priceCalculations', () => {
    it('uses explicit price overrides before Velodrome prices', () => {
        expect(calculateTokenPrice('HAI', prices, { HAI: 1.287 })).toBe(1.287)
        expect(calculateTokenPrice('ALETH', prices, { HAI: 1.287 })).toBe(650)
    })

    it('applies price overrides when calculating pool TVL', () => {
        const tvl = calculatePoolTVL(
            {
                address: '0xpool',
                token0: '0xhai',
                token1: '0xaleth',
                decimals: 18,
                reserve0: '100000000000000000000',
                reserve1: '2000000000000000000',
                staked0: '100000000000000000000',
                staked1: '2000000000000000000',
                tokenPair: ['HAI', 'ALETH'],
            },
            {
                hai: { address: '0xhai', symbol: 'HAI' },
                aleth: { address: '0xaleth', symbol: 'ALETH' },
            },
            prices,
            { HAI: 1.287 }
        )

        expect(tvl.totalTvl).toBeCloseTo(1428.7)
    })
})

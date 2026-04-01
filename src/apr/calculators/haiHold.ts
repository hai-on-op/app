import type { AprComponent, BoostData } from '../types'

interface HaiHoldInput {
    redemptionRateAnnualized: number // raw from subgraph e.g. 1.05
    coinTotalSupply: number
    haiPrice: number
    userHaiBalance: number
}

interface HaiHoldResult {
    baseApr: number // decimal
    components: AprComponent[]
    boost: null
    tvl: number
    userPosition: number
}

/**
 * HAI Hold strategy APR.
 * APR = annualizedRedemptionRate - 1
 * Already in decimal form from the subgraph.
 */
export function calculateHaiHoldApr(input: HaiHoldInput): HaiHoldResult {
    const { redemptionRateAnnualized, coinTotalSupply, haiPrice, userHaiBalance } = input

    const baseApr = redemptionRateAnnualized - 1

    return {
        baseApr,
        components: [
            {
                source: 'redemption-rate',
                apr: baseApr,
                boosted: false,
                label: 'Redemption Rate',
            },
        ],
        boost: null,
        tvl: coinTotalSupply * haiPrice,
        userPosition: userHaiBalance * haiPrice,
    }
}

import type { AprComponent, BoostData } from '../types'

interface HaiAeroDepositInput {
    mapping: Record<string, string> // address -> haiAERO qty
    boostMap: Record<string, number> // address -> boost multiplier (1-2)
    haiAeroPrice: number
    haiPrice: number
    weeklyHaiReward: number // raw HAI over 7-day window
    userAddress?: string
}

interface HaiAeroDepositResult {
    baseApr: number // decimal
    components: AprComponent[]
    boost: BoostData
    tvl: number
    userPosition: number
}

/**
 * haiAERO Deposit strategy APR.
 *
 * Same principle as haiVELO: APR is against raw TVL (unboosted positions).
 * Boost affects reward distribution, not the APR denominator.
 */
export function calculateHaiAeroDepositApr(input: HaiAeroDepositInput): HaiAeroDepositResult {
    const { mapping, boostMap, haiAeroPrice, haiPrice, weeklyHaiReward, userAddress } = input

    const dailyRewardQty = weeklyHaiReward / 7 || 0
    const dailyRewardValue = dailyRewardQty * (haiPrice || 0)

    // Raw TVL from collateral mapping (unboosted)
    const totalQty = Object.values(mapping).reduce((acc, v) => acc + Number(v), 0)
    const tvl = totalQty * (haiAeroPrice || 0)

    // Boost-weighted totals (used for reward distribution, NOT APR denominator)
    const totalBoostedQty = Object.entries(mapping).reduce((acc, [address, value]) => {
        const boost = boostMap[address] || 1
        return acc + Number(value) * boost
    }, 0)
    const totalBoostedValueParticipating = totalBoostedQty * (haiAeroPrice || 0)

    // User-specific
    const userAddr = userAddress?.toLowerCase()
    const myBoost = userAddr ? boostMap[userAddr] || 1 : 1
    const myQty = userAddr ? Number(mapping[userAddr] || 0) : 0
    const myValueParticipating = myQty * (haiAeroPrice || 0)
    const myBoostedValueParticipating = myValueParticipating * myBoost
    const myBoostedShare = totalBoostedValueParticipating > 0 ? myBoostedValueParticipating / totalBoostedValueParticipating : 0

    // Base APR is against raw TVL (unboosted positions)
    const baseApr = tvl > 0 ? (dailyRewardValue * 365) / tvl : 0

    // User's effective APR: boost multiplies personal return
    const boostedApr = myBoost * baseApr

    return {
        baseApr,
        components: [
            {
                source: 'hai-rewards',
                apr: baseApr,
                boosted: true,
                label: 'HAI Rewards',
            },
        ],
        boost: {
            myBoost,
            baseApr,
            boostedApr,
            totalBoostedValueParticipating,
            myValueParticipating,
            myBoostedValueParticipating,
            myBoostedShare,
        },
        tvl,
        userPosition: myValueParticipating,
    }
}

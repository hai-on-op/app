import type { AprComponent, BoostData } from '../types'

interface HaiVeloDepositInput {
    mapping: Record<string, string> // address -> haiVELO qty
    boostMap: Record<string, number> // address -> boost multiplier (1-2)
    haiVeloPrice: number
    haiPrice: number
    weeklyHaiReward: number // raw HAI over 7-day window
    haiVeloDepositTvl: number // pre-computed in Phase 1
    haiVeloVeloLpStakedTvl: number // pre-computed in Phase 1 (resolves circular dep)
    userAddress?: string
}

interface HaiVeloDepositResult {
    baseApr: number // decimal
    components: AprComponent[]
    boost: BoostData
    tvl: number
    userPosition: number
}

/**
 * haiVELO Deposit strategy APR.
 *
 * HAI rewards are shared between haiVELO depositors and haiVELO/VELO LP stakers
 * proportional to TVL.
 *
 * APR is calculated against the RAW (unboosted) TVL — this represents the return
 * per dollar of position value. Boost does NOT change the base APR; it changes
 * how rewards are *distributed*. A user with 2x boost receives double the share
 * of the distribution, which effectively gives them 2× the base APR personally.
 *
 * Formula:
 *   haiVeloRewardShare = depositTvl / (depositTvl + lpStakedTvl)
 *   adjustedWeeklyReward = weeklyHaiReward * haiVeloRewardShare
 *   dailyRewardValue = (adjustedWeeklyReward / 7) * haiPrice
 *   baseAPR = (dailyRewardValue / rawTVL) * 365        ← unboosted denominator
 *   myEffectiveAPR = myBoost * baseAPR                  ← boost multiplies your personal APR
 *
 * Output is normalized to decimal (0.05 = 5%).
 */
export function calculateHaiVeloDepositApr(input: HaiVeloDepositInput): HaiVeloDepositResult {
    const {
        mapping,
        boostMap,
        haiVeloPrice,
        haiPrice,
        weeklyHaiReward,
        haiVeloDepositTvl,
        haiVeloVeloLpStakedTvl,
        userAddress,
    } = input

    // Reward sharing between haiVELO depositors and LP stakers
    const totalParticipatingTvl = haiVeloDepositTvl + haiVeloVeloLpStakedTvl
    const haiVeloRewardShare =
        haiVeloDepositTvl > 0 && totalParticipatingTvl > 0 ? haiVeloDepositTvl / totalParticipatingTvl : 1
    const adjustedWeeklyReward = weeklyHaiReward * haiVeloRewardShare

    const dailyRewardQty = adjustedWeeklyReward / 7 || 0
    const dailyRewardValue = dailyRewardQty * (haiPrice || 0)

    // Boost-weighted totals (used for reward distribution, NOT for APR denominator)
    const totalBoostedQty = Object.entries(mapping).reduce((acc, [address, value]) => {
        const boost = boostMap[address] || 1
        return acc + Number(value) * boost
    }, 0)
    const totalBoostedValueParticipating = totalBoostedQty * (haiVeloPrice || 0)

    // User-specific
    const userAddr = userAddress?.toLowerCase()
    const myBoost = userAddr ? boostMap[userAddr] || 1 : 1
    const myQty = userAddr ? Number(mapping[userAddr] || 0) : 0
    const myValueParticipating = myQty * (haiVeloPrice || 0)
    const myBoostedValueParticipating = myValueParticipating * myBoost
    const myBoostedShare = totalBoostedValueParticipating > 0 ? myBoostedValueParticipating / totalBoostedValueParticipating : 0

    // Base APR is against the RAW (unboosted) TVL
    const baseApr = haiVeloDepositTvl > 0 ? (dailyRewardValue * 365) / haiVeloDepositTvl : 0

    // User's effective APR: boost multiplies their personal return
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
        tvl: haiVeloDepositTvl,
        userPosition: myValueParticipating,
    }
}

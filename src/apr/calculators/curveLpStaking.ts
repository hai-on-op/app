import type { AprComponent, BoostData } from '../types'
import { calculateLPBoost } from './boost'

interface CurveLpStakingInput {
    curveVApy: number // decimal from Curve API
    dailyKiteReward: number
    kitePrice: number
    totalStakedLp: number
    userStakedLp: number
    lpPriceUsd: number
    userKiteStaked: number
    totalKiteStaked: number
}

interface CurveLpStakingResult {
    baseApr: number // decimal (net = underlying + incentives)
    components: AprComponent[]
    boost: BoostData
    tvl: number
    userPosition: number
}

/**
 * HAI-BOLD Curve LP Staking APR.
 *
 * Components:
 *   underlying = Curve vAPY (trading fees)
 *   incentives = (dailyKiteReward * kitePrice * 365) / totalStakedValueUsd
 *   net = underlying + incentives
 *
 * Boost applies ONLY to KITE incentives:
 *   boostedNet = underlying + (incentives * lpBoost)
 */
export function calculateCurveLpStakingApr(input: CurveLpStakingInput): CurveLpStakingResult {
    const {
        curveVApy,
        dailyKiteReward,
        kitePrice,
        totalStakedLp,
        userStakedLp,
        lpPriceUsd,
        userKiteStaked,
        totalKiteStaked,
    } = input

    const totalStakedValueUsd = totalStakedLp * lpPriceUsd
    const userPositionUsd = userStakedLp * lpPriceUsd

    const underlyingApr = curveVApy // already decimal
    const incentivesApr =
        totalStakedValueUsd > 0 && kitePrice > 0 ? (dailyKiteReward * kitePrice * 365) / totalStakedValueUsd : 0

    const netApr = underlyingApr + incentivesApr

    // Boost calculation
    const boostResult =
        userStakedLp > 0 && totalStakedLp > 0
            ? calculateLPBoost({
                  userStakingAmount: userKiteStaked,
                  totalStakingAmount: totalKiteStaked,
                  userLPPosition: userStakedLp,
                  totalPoolLiquidity: totalStakedLp,
              })
            : { lpBoost: 1 }
    const myBoost = boostResult.lpBoost ?? 1

    // Boost applies only to incentives
    const boostedIncentivesApr = incentivesApr * myBoost
    const boostedNetApr = underlyingApr + boostedIncentivesApr

    return {
        baseApr: netApr,
        components: [
            {
                source: 'underlying-yield',
                apr: underlyingApr,
                boosted: false,
                label: 'Underlying LP APY',
            },
            {
                source: 'kite-incentives',
                apr: incentivesApr,
                boosted: true,
                label: 'KITE Incentives',
            },
        ],
        boost: {
            myBoost,
            baseApr: netApr,
            boostedApr: boostedNetApr,
            totalBoostedValueParticipating: totalStakedValueUsd,
            myValueParticipating: userPositionUsd,
            myBoostedValueParticipating: userPositionUsd * myBoost,
            myBoostedShare: totalStakedValueUsd > 0 ? (userPositionUsd * myBoost) / totalStakedValueUsd : 0,
        },
        tvl: totalStakedValueUsd,
        userPosition: userPositionUsd,
    }
}

import type { AprComponent, BoostData } from '../types'
import { calculateLPBoost } from './boost'

interface VelodromeLpStakingInput {
    tradingFeeApr: number // decimal
    haiRewardsApr: number // decimal, pre-computed with reward share
    dailyKiteReward: number
    kitePrice: number
    totalStakedLp: number
    userStakedLp: number
    lpPriceUsd: number
    userKiteStaked: number
    totalKiteStaked: number
}

interface VelodromeLpStakingResult {
    baseApr: number // decimal
    components: AprComponent[]
    boost: BoostData
    tvl: number
    userPosition: number
}

/**
 * haiVELO/VELO Velodrome LP Staking APR.
 *
 * Components:
 *   underlying  = trading fee APR (from pool data)
 *   haiRewards  = shared HAI rewards APR (LP's proportional share)
 *   incentives  = KITE incentives APR
 *   net = underlying + haiRewards + incentives
 *
 * Boost applies ONLY to KITE incentives:
 *   boostedNet = underlying + haiRewards + (incentives * lpBoost)
 */
export function calculateVelodromeLpStakingApr(input: VelodromeLpStakingInput): VelodromeLpStakingResult {
    const {
        tradingFeeApr,
        haiRewardsApr,
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

    const incentivesApr =
        totalStakedValueUsd > 0 && kitePrice > 0 ? (dailyKiteReward * kitePrice * 365) / totalStakedValueUsd : 0

    const netApr = tradingFeeApr + haiRewardsApr + incentivesApr

    // Boost
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

    const boostedIncentivesApr = incentivesApr * myBoost
    const boostedNetApr = tradingFeeApr + haiRewardsApr + boostedIncentivesApr

    return {
        baseApr: netApr,
        components: [
            {
                source: 'trading-fees',
                apr: tradingFeeApr,
                boosted: false,
                label: 'Trading Fees',
            },
            {
                source: 'hai-rewards',
                apr: haiRewardsApr,
                boosted: false,
                label: 'HAI Rewards',
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

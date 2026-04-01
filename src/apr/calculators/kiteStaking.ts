import { utils } from 'ethers'
import type { BigNumber } from 'ethers'
import type { AprComponent } from '../types'

interface KiteStakingInput {
    rewardRates: Array<{ rpToken: string; rpRate: BigNumber }>
    tokenPricesByAddress: Record<string, number> // token address -> USD price
    totalKiteStaked: number // in KITE tokens
    kitePrice: number
}

interface KiteStakingResult {
    baseApr: number // decimal
    components: AprComponent[]
    boost: null
    tvl: number
    userPosition: number
}

/**
 * KITE Staking APR.
 *
 * Sums annualized reward value across all reward pools:
 *   totalRewardsPerSec = sum(rpRate * tokenPrice) for each pool
 *   yearlyValue = totalRewardsPerSec * 31,536,000
 *   aprBasisPoints = (yearlyValue * 10000) / (totalStaked * kitePrice)
 *   apr = aprBasisPoints / 10000  (convert to decimal)
 */
export function calculateKiteStakingApr(
    input: KiteStakingInput & { userKiteStaked: number }
): KiteStakingResult {
    const { rewardRates, tokenPricesByAddress, totalKiteStaked, kitePrice, userKiteStaked } = input

    const tvl = totalKiteStaked * kitePrice
    const userPosition = userKiteStaked * kitePrice

    if (!rewardRates?.length || totalKiteStaked === 0 || kitePrice === 0) {
        return {
            baseApr: 0,
            components: [{ source: 'staking-rewards', apr: 0, boosted: false, label: 'Staking Rewards' }],
            boost: null,
            tvl,
            userPosition,
        }
    }

    // Sum rewards per second in 18-decimal fixed point
    const stakingApyRewardsTotal = rewardRates.reduce((acc, item) => {
        const price = tokenPricesByAddress[item.rpToken] || 0
        if (isNaN(price) || price === 0) return acc
        const scaledPrice = utils.parseUnits(price.toString(), 18)
        const amount = item.rpRate.mul(scaledPrice)
        return acc.add(amount)
    }, utils.parseUnits('0', 18))

    // Annualize
    const stakingApyRewardsTotalYearly = stakingApyRewardsTotal.mul(31536000)

    if (isNaN(kitePrice)) {
        return {
            baseApr: 0,
            components: [{ source: 'staking-rewards', apr: 0, boosted: false, label: 'Staking Rewards' }],
            boost: null,
            tvl,
            userPosition,
        }
    }

    const scaledKitePrice = utils.parseUnits(kitePrice.toString(), 18)
    const scaledTotalStaked = utils.parseUnits(totalKiteStaked.toString(), 18)
    const scaledTotalStakedUSD = scaledTotalStaked.mul(scaledKitePrice)

    // APR in basis points
    const aprBasisPoints = Number(stakingApyRewardsTotalYearly.mul(10000).div(scaledTotalStakedUSD).toString())

    // Convert to decimal
    const baseApr = aprBasisPoints / 10000

    return {
        baseApr,
        components: [
            {
                source: 'staking-rewards',
                apr: baseApr,
                boosted: false,
                label: 'Staking Rewards',
            },
        ],
        boost: null,
        tvl,
        userPosition,
    }
}

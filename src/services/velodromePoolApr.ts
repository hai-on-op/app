import { formatUnits } from 'ethers/lib/utils'
import type { VelodromeLpData } from '~/hooks/useVelodrome'

export type VelodromeLpValueResult = {
    tvlUsd: number
    lpPriceUsd: number
    reserve0Formatted: number // haiVELO or first token
    reserve1Formatted: number // VELO or second token
    totalSupplyFormatted: number
}

/**
 * Calculate LP value for Velodrome stable pools.
 *
 * For stable pools like haiVELO/VELO that trade near 1:1:
 * - TVL = veloPrice * (reserve0 + reserve1)
 * - LP Token Price = TVL / totalSupply
 *
 * This simplified method works well when token ratios are close to 1:1.
 * Per the DeFi analyst: "for the haiVELO/VELO LP TVL, when ratios are not too far off,
 * velodrome treats it as 1:1. basically takes the price of VELO and multiplies it by
 * the total amount of VELO + haiVELO tokens for TVL"
 */
export function calculateVelodromeLpValue(params: {
    reserve0: string // Raw reserve (18 decimals typically)
    reserve1: string
    totalSupply: string // liquidity field from Sugar
    veloPrice: number
    decimals?: number
}): VelodromeLpValueResult {
    const { reserve0, reserve1, totalSupply, veloPrice, decimals = 18 } = params

    // Convert from raw values to human-readable
    const reserve0Formatted = Number(formatUnits(reserve0 || '0', decimals))
    const reserve1Formatted = Number(formatUnits(reserve1 || '0', decimals))
    const totalSupplyFormatted = Number(formatUnits(totalSupply || '0', decimals))

    // For stable pools, treat tokens as 1:1 and use VELO price for both
    const totalTokens = reserve0Formatted + reserve1Formatted
    const tvlUsd = totalTokens * veloPrice

    // LP token price
    const lpPriceUsd = totalSupplyFormatted > 0 ? tvlUsd / totalSupplyFormatted : 0

    console.log(`[VelodromePoolApr] ====== LP VALUE CALCULATION ======`)
    console.log(`[VelodromePoolApr] Reserve0 (haiVELO): ${reserve0Formatted.toFixed(4)}`)
    console.log(`[VelodromePoolApr] Reserve1 (VELO): ${reserve1Formatted.toFixed(4)}`)
    console.log(`[VelodromePoolApr] Total Tokens in Pool: ${totalTokens.toFixed(4)}`)
    console.log(`[VelodromePoolApr] VELO Price: $${veloPrice.toFixed(4)}`)
    console.log(`[VelodromePoolApr] Pool TVL USD: $${tvlUsd.toFixed(2)}`)
    console.log(`[VelodromePoolApr] Total LP Supply: ${totalSupplyFormatted.toFixed(4)}`)
    console.log(`[VelodromePoolApr] LP Token Price: $${lpPriceUsd.toFixed(6)}`)
    console.log(`[VelodromePoolApr] ================================`)

    return {
        tvlUsd,
        lpPriceUsd,
        reserve0Formatted,
        reserve1Formatted,
        totalSupplyFormatted,
    }
}

/**
 * Calculate LP value from VelodromeLpData (from Sugar contract)
 */
export function calculateVelodromeLpValueFromPool(pool: VelodromeLpData, veloPrice: number): VelodromeLpValueResult {
    return calculateVelodromeLpValue({
        reserve0: pool.reserve0,
        reserve1: pool.reserve1,
        totalSupply: pool.liquidity,
        veloPrice,
        decimals: pool.decimals,
    })
}

/**
 * Calculate HAI reward share for LP stakers based on TVL proportion.
 *
 * HAI rewards are shared between:
 * - haiVELO depositors (collateral in vaults)
 * - haiVELO/VELO LP stakers
 *
 * The share is proportional to TVL:
 * lpShare = lpStakedTvlUsd / (lpStakedTvlUsd + haiVeloDepositTvlUsd)
 */
export function calculateHaiRewardShare(params: { lpStakedTvlUsd: number; haiVeloDepositTvlUsd: number }): {
    lpShare: number
    haiVeloShare: number
    totalParticipatingTvl: number
} {
    const { lpStakedTvlUsd, haiVeloDepositTvlUsd } = params

    const totalParticipatingTvl = lpStakedTvlUsd + haiVeloDepositTvlUsd

    if (totalParticipatingTvl <= 0) {
        return { lpShare: 0, haiVeloShare: 0, totalParticipatingTvl: 0 }
    }

    const lpShare = lpStakedTvlUsd / totalParticipatingTvl
    const haiVeloShare = haiVeloDepositTvlUsd / totalParticipatingTvl

    console.log(`[VelodromePoolApr] ====== HAI REWARD SHARE CALCULATION ======`)
    console.log(`[VelodromePoolApr] LP Staked TVL: $${lpStakedTvlUsd.toFixed(2)}`)
    console.log(`[VelodromePoolApr] haiVELO Deposit TVL: $${haiVeloDepositTvlUsd.toFixed(2)}`)
    console.log(`[VelodromePoolApr] Total Participating TVL: $${totalParticipatingTvl.toFixed(2)}`)
    console.log(`[VelodromePoolApr] LP Share of HAI Rewards: ${(lpShare * 100).toFixed(2)}%`)
    console.log(`[VelodromePoolApr] haiVELO Share of HAI Rewards: ${(haiVeloShare * 100).toFixed(2)}%`)
    console.log(`[VelodromePoolApr] ==========================================`)

    return { lpShare, haiVeloShare, totalParticipatingTvl }
}

/**
 * Calculate APR from HAI rewards for LP stakers.
 *
 * Formula:
 * - Weekly HAI reward = latestTransferAmount (raw, already in 7-day window)
 * - Daily HAI reward = weeklyReward / 7
 * - LP's daily HAI reward = dailyReward * lpShare
 * - Annual LP HAI reward USD = lpDailyReward * 365 * haiPrice
 * - HAI APR = annualRewardUsd / lpStakedTvlUsd
 */
export function calculateHaiRewardsApr(params: {
    weeklyHaiReward: number // HAI amount over 7 days
    haiPrice: number
    lpShare: number // Proportion of rewards going to LP stakers
    lpStakedTvlUsd: number
}): { haiApr: number; dailyHaiRewardUsd: number; annualHaiRewardUsd: number } {
    const { weeklyHaiReward, haiPrice, lpShare, lpStakedTvlUsd } = params

    if (lpStakedTvlUsd <= 0) {
        return { haiApr: 0, dailyHaiRewardUsd: 0, annualHaiRewardUsd: 0 }
    }

    // Calculate LP's share of daily rewards
    const dailyHaiReward = weeklyHaiReward / 7
    const lpDailyHaiReward = dailyHaiReward * lpShare
    const dailyHaiRewardUsd = lpDailyHaiReward * haiPrice

    // Annualize
    const annualHaiRewardUsd = dailyHaiRewardUsd * 365
    const haiApr = annualHaiRewardUsd / lpStakedTvlUsd

    console.log(`[VelodromePoolApr] ====== HAI REWARDS APR CALCULATION ======`)
    console.log(`[VelodromePoolApr] Weekly HAI Reward (total): ${weeklyHaiReward.toFixed(4)} HAI`)
    console.log(`[VelodromePoolApr] Daily HAI Reward (total): ${dailyHaiReward.toFixed(4)} HAI`)
    console.log(`[VelodromePoolApr] LP's Daily HAI Reward: ${lpDailyHaiReward.toFixed(4)} HAI`)
    console.log(`[VelodromePoolApr] HAI Price: $${haiPrice.toFixed(4)}`)
    console.log(`[VelodromePoolApr] LP's Daily HAI Reward USD: $${dailyHaiRewardUsd.toFixed(2)}`)
    console.log(`[VelodromePoolApr] LP's Annual HAI Reward USD: $${annualHaiRewardUsd.toFixed(2)}`)
    console.log(`[VelodromePoolApr] HAI Rewards APR: ${(haiApr * 100).toFixed(2)}%`)
    console.log(`[VelodromePoolApr] =========================================`)

    return { haiApr, dailyHaiRewardUsd, annualHaiRewardUsd }
}

/**
 * Calculate KITE incentives APR for LP staking.
 * Same formula as Curve LP staking.
 */
export function calculateKiteIncentivesApr(params: {
    dailyKiteReward: number
    kitePrice: number
    totalStakedValueUsd: number
}): number {
    const { dailyKiteReward, kitePrice, totalStakedValueUsd } = params

    if (totalStakedValueUsd <= 0 || kitePrice <= 0) {
        console.log('[VelodromePoolApr] Cannot calculate KITE incentives APR - missing data')
        return 0
    }

    const annualKiteRewardUsd = dailyKiteReward * 365 * kitePrice
    const incentivesApr = annualKiteRewardUsd / totalStakedValueUsd

    console.log(`[VelodromePoolApr] ====== KITE INCENTIVES APR ======`)
    console.log(`[VelodromePoolApr] Daily KITE reward: ${dailyKiteReward} KITE`)
    console.log(`[VelodromePoolApr] KITE price: $${kitePrice.toFixed(4)}`)
    console.log(`[VelodromePoolApr] Annual reward value: $${annualKiteRewardUsd.toFixed(2)}`)
    console.log(`[VelodromePoolApr] Total staked value: $${totalStakedValueUsd.toFixed(2)}`)
    console.log(`[VelodromePoolApr] KITE Incentives APR: ${(incentivesApr * 100).toFixed(2)}%`)
    console.log(`[VelodromePoolApr] =================================`)

    return incentivesApr
}

/**
 * Calculate trading fee APR for Velodrome LP.
 *
 * For unstaked LP (LP held outside the gauge), LP holders earn trading fees.
 * The pool_fee represents the fee rate in basis points (e.g., 5 = 0.05%).
 *
 * Since we don't have historical trading volume, we estimate based on:
 * - Accumulated fees (token0_fees, token1_fees) from the Sugar contract
 * - Assuming these represent approximately 1 week of fee accumulation
 *
 * Note: This is an estimate. For more accuracy, we would need to query
 * epochsByAddress for historical fee data.
 */
export function calculateTradingFeeApr(params: {
    token0Fees: string
    token1Fees: string
    poolTvlUsd: number
    veloPrice: number
    decimals?: number
}): { tradingFeeApr: number; weeklyFeesUsd: number } {
    const { token0Fees, token1Fees, poolTvlUsd, veloPrice, decimals = 18 } = params

    if (poolTvlUsd <= 0 || veloPrice <= 0) {
        console.log('[VelodromePoolApr] Cannot calculate trading fee APR - missing TVL or price')
        return { tradingFeeApr: 0, weeklyFeesUsd: 0 }
    }

    // Convert fees to human-readable (both tokens are ~VELO value for stable pools)
    const fees0 = Number(formatUnits(token0Fees || '0', decimals))
    const fees1 = Number(formatUnits(token1Fees || '0', decimals))

    // For stable pools, treat both token fees as having VELO price
    const weeklyFeesUsd = (fees0 + fees1) * veloPrice

    // Annualize: assume accumulated fees represent ~1 week
    const annualFeesUsd = weeklyFeesUsd * 52
    const tradingFeeApr = annualFeesUsd / poolTvlUsd

    console.log(`[VelodromePoolApr] ====== TRADING FEE APR ESTIMATE ======`)
    console.log(`[VelodromePoolApr] Token0 Fees: ${fees0.toFixed(4)}`)
    console.log(`[VelodromePoolApr] Token1 Fees: ${fees1.toFixed(4)}`)
    console.log(`[VelodromePoolApr] VELO Price: $${veloPrice.toFixed(4)}`)
    console.log(`[VelodromePoolApr] Weekly Fees USD (estimate): $${weeklyFeesUsd.toFixed(2)}`)
    console.log(`[VelodromePoolApr] Annual Fees USD (estimate): $${annualFeesUsd.toFixed(2)}`)
    console.log(`[VelodromePoolApr] Pool TVL USD: $${poolTvlUsd.toFixed(2)}`)
    console.log(`[VelodromePoolApr] Trading Fee APR (estimate): ${(tradingFeeApr * 100).toFixed(4)}%`)
    console.log(`[VelodromePoolApr] ======================================`)

    return { tradingFeeApr, weeklyFeesUsd }
}

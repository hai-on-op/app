import type { BoostAprResult } from '~/types/rewards'

export function computeHaiVeloBoostApr(params: {
    mapping: Record<string, string | number>
    boostMap: Record<string, number>
    haiVeloPriceUsd: number
    haiPriceUsd: number
    latestTransferAmount: number // HAI amount over 7d window
    userAddress?: string
}): BoostAprResult {
    const { mapping, boostMap, haiVeloPriceUsd, haiPriceUsd, latestTransferAmount, userAddress } = params
    const dailyRewardQty = (latestTransferAmount || 0) / 7
    const dailyRewardUsd = dailyRewardQty * (haiPriceUsd || 0)

    const totalBoostedQty = Object.entries(mapping).reduce((acc, [addr, qty]) => acc + Number(qty) * (boostMap[addr.toLowerCase()] || 1), 0)
    const totalBoostedValueUsd = totalBoostedQty * (haiVeloPriceUsd || 0)

    const user = userAddress?.toLowerCase()
    const myBoost = user ? (boostMap[user] || 1) : 1
    const baseAprPct = totalBoostedValueUsd > 0 ? (dailyRewardUsd / totalBoostedValueUsd) * 365 * 100 : 0
    const myBoostedAprPct = myBoost * baseAprPct

    return { baseAprPct, myBoost, myBoostedAprPct, totals: { boostedValueUsd: totalBoostedValueUsd } }
}

export function computeVaultBoostApr(params: {
    userDebtMapping: Record<string, string | number>
    boostMap: Record<string, number>
    dailyRewardsUsd: number
    userAddress?: string
    collateralPriceUsd?: number
}): BoostAprResult {
    const { userDebtMapping, boostMap, dailyRewardsUsd, userAddress } = params
    const totalBoostedQty = Object.entries(userDebtMapping).reduce((acc, [addr, qty]) => acc + Number(qty) * (boostMap[addr.toLowerCase()] || 1), 0)
    const totalBoostedValueUsd = totalBoostedQty // callers should pass values already in USD if needed
    const user = userAddress?.toLowerCase()
    const myBoost = user ? (boostMap[user] || 1) : 1
    const baseAprPct = totalBoostedValueUsd > 0 ? (dailyRewardsUsd / totalBoostedValueUsd) * 365 * 100 : 0
    const myBoostedAprPct = myBoost * baseAprPct
    return { baseAprPct, myBoost, myBoostedAprPct, totals: { boostedValueUsd: totalBoostedValueUsd } }
}



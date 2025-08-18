import { REWARDS } from '~/utils/rewards'
import type { BasisPointsNumber, VaultRewardSchedule } from '~/types/rewards'

export function getVaultSchedule(symbol: string): VaultRewardSchedule[] {
    const cfg = REWARDS.vaults[symbol as keyof typeof REWARDS.vaults] || {}
    const entries = Object.entries(cfg) as Array<[string, number]>
    return entries
        .filter(([, amt]) => Number(amt) > 0)
        .map(([token, dailyAmount]) => ({ token: token as VaultRewardSchedule['token'], dailyAmount }))
}

export function computeVaultApr({ schedule, totalBoostedValueUsd }: { schedule: VaultRewardSchedule[]; totalBoostedValueUsd: number }): BasisPointsNumber {
    if (!Array.isArray(schedule) || totalBoostedValueUsd <= 0) return 0
    const totalDailyRewardsUsd = schedule.reduce((acc, cur) => acc + Number(cur.dailyAmount || 0), 0)
    const aprPct = (totalDailyRewardsUsd / totalBoostedValueUsd) * 365 * 100
    return Math.max(0, aprPct)
}



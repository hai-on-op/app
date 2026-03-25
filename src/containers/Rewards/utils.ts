import type { StrategyTotalEntry, StrategyPosition } from './types'

// Sum duplicate strategy+token entries (e.g. two lpStaking pools)
export function sumStrategyTotals(totals: StrategyTotalEntry[]): StrategyTotalEntry[] {
    const map = new Map<string, StrategyTotalEntry>()
    for (const entry of totals) {
        const key = `${entry.strategy}|${entry.token}`
        const existing = map.get(key)
        if (existing) {
            if (entry.avgDailyTotal !== undefined) {
                existing.avgDailyTotal = (existing.avgDailyTotal || 0) + entry.avgDailyTotal
            }
            if (entry.totalReward !== undefined) {
                existing.totalReward = (existing.totalReward || 0) + entry.totalReward
            }
        } else {
            map.set(key, { ...entry })
        }
    }
    return Array.from(map.values())
}

// User's fraction of daily pool for a token
export function calcUserShare(userEarned: number, totalReward: number): number {
    if (!totalReward) return 0
    return userEarned / totalReward
}

// Max boost potential: how much more the user would earn at 2.0x boost
export function calcMaxBoostPotential(
    pos: StrategyPosition,
    strategyPoolTotal: number,
    currentEarned: number
): { maxEarned: number; extraEarned: number; pctIncrease: number } | null {
    if (pos.endOfDayBoost >= 2.0) return null

    const s = pos.avgWeight / pos.avgTotalWeight
    const b = pos.endOfDayBoost
    const maxShare = (2 * s) / (b * (1 - s) + 2 * s)
    const maxEarned = strategyPoolTotal * maxShare
    const extraEarned = maxEarned - currentEarned
    const pctIncrease = currentEarned > 0 ? extraEarned / currentEarned : 0

    return { maxEarned, extraEarned, pctIncrease }
}

// Average boost from avgBoosts (mean of values > 1.0)
export function calcAverageBoost(avgBoosts: Record<string, number>): number {
    const values = Object.values(avgBoosts).filter((b) => b > 1)
    if (values.length === 0) return 1
    return values.reduce((sum, v) => sum + v, 0) / values.length
}

// Tiered token amount formatting per spec
export function formatRewardAmount(value: number): string {
    if (value === 0) return '0'
    const abs = Math.abs(value)
    if (abs >= 1000) return value.toFixed(1)
    if (abs >= 1) return value.toFixed(3)
    if (abs >= 0.001) return value.toFixed(5)
    return value.toExponential(2)
}

// Percentage formatting per spec
export function formatShare(value: number): string {
    const pct = value * 100
    if (pct >= 1) return `${pct.toFixed(1)}%`
    if (pct >= 0.01) return `${pct.toFixed(2)}%`
    if (pct > 0) return `${pct.toFixed(4)}%`
    return '0%'
}

// Boost formatting: "1.33x"
export function formatBoost(value: number): string {
    return `${value.toFixed(2)}x`
}

// Boost color by threshold
export function getBoostColor(boost: number): string {
    if (boost >= 1.8) return '#10b981' // green
    if (boost >= 1.3) return '#f59e0b' // amber
    return '#6b7280' // muted gray
}

// Human-readable boost key labels
export const BOOST_KEY_LABELS: Record<string, string> = {
    minter: 'Minter',
    haivelo: 'haiVELO',
    haiaero: 'haiAERO',
    lpStaking_HAI_BOLD_CURVE: 'LP (HAI/BOLD)',
    lpStaking_HAI_VELO_VELO: 'LP (HAI/VELO)',
    lp: 'LP (Uniswap)',
}

// Human-readable strategy labels
export const STRATEGY_LABELS: Record<string, string> = {
    haiVELO: 'haiVELO',
    'haiVELO-historical': 'haiVELO (hist)',
    haiAERO: 'haiAERO',
    lpStaking: 'LP Staking',
    minter: 'Minter',
    LP: 'LP',
}

// Get strategy pool total for a specific strategy+token from day's strategyTotals
export function getStrategyPoolTotal(
    strategyTotals: StrategyTotalEntry[],
    strategy: string,
    token: string
): number {
    return strategyTotals
        .filter((s) => s.strategy === strategy && s.token === token)
        .reduce((sum, s) => sum + (s.totalReward || 0), 0)
}

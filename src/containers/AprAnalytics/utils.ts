import type { StrategyAprResult, AprComponent, BoostData } from '~/apr/types'

export function formatApr(value: number): string {
    const pct = value * 100
    if (pct >= 100) return `${pct.toFixed(0)}%`
    if (pct >= 10) return `${pct.toFixed(1)}%`
    if (pct >= 1) return `${pct.toFixed(2)}%`
    if (pct >= 0.01) return `${pct.toFixed(3)}%`
    if (pct > 0) return `${pct.toFixed(4)}%`
    return '0%'
}

export function formatUsd(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`
    if (value >= 1) return `$${value.toFixed(2)}`
    if (value > 0) return `$${value.toFixed(4)}`
    return '$0.00'
}

export function formatBoost(value: number): string {
    return `${value.toFixed(2)}x`
}

export function formatNumber(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`
    if (value >= 1) return value.toFixed(2)
    if (value > 0) return value.toFixed(4)
    return '0'
}

export function getStrategyLabel(id: string): string {
    const labels: Record<string, string> = {
        'hai-hold': 'HAI Hold',
        'haivelo-deposit': 'haiVELO Deposit',
        'haiaero-deposit': 'haiAERO Deposit',
        'kite-staking': 'KITE Staking',
        'haibold-curve-lp': 'HAI-BOLD Curve LP',
        'haivelo-velo-lp': 'haiVELO/VELO LP',
    }
    if (labels[id]) return labels[id]
    if (id.startsWith('vault-')) return `Mint ${id.replace('vault-', '')}`
    if (id.startsWith('velo-')) return `Velodrome Farm`
    return id
}

export function getStrategyTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        hold: 'Hold',
        deposit: 'Deposit',
        stake: 'Stake',
        borrow: 'Borrow / Mint',
        farm: 'Farm',
    }
    return labels[type] || type
}

export function getSourceLabel(source: string): string {
    const labels: Record<string, string> = {
        'redemption-rate': 'Redemption Rate',
        'hai-rewards': 'HAI Rewards',
        'kite-incentives': 'KITE Incentives',
        'staking-rewards': 'Staking Rewards',
        'underlying-yield': 'Underlying Yield',
        'trading-fees': 'Trading Fees',
        'velo-emissions': 'VELO Emissions',
    }
    return labels[source] || source
}

export function getBoostColor(boost: number): string {
    if (boost >= 1.8) return '#10b981'
    if (boost >= 1.3) return '#f59e0b'
    return '#6b7280'
}

export function getAprColor(apr: number): string {
    if (apr >= 0.2) return '#10b981'
    if (apr >= 0.05) return '#22d3ee'
    return 'inherit'
}

export function sortByTvl(a: StrategyAprResult, b: StrategyAprResult): number {
    return b.tvl - a.tvl
}

export function sortByApr(a: StrategyAprResult, b: StrategyAprResult): number {
    return b.effectiveApr - a.effectiveApr
}

/**
 * Calculate estimated daily rewards in USD from APR and TVL.
 * dailyRewardUsd = (baseApr * tvl) / 365
 */
export function estimateDailyRewardsUsd(strategy: StrategyAprResult): number {
    return (strategy.baseApr * strategy.tvl) / 365
}

/**
 * Calculate estimated daily rewards for user from APR and position.
 */
export function estimateUserDailyRewardsUsd(strategy: StrategyAprResult): number {
    const apr = strategy.boost?.boostedApr ?? strategy.baseApr
    return (apr * strategy.userPosition) / 365
}

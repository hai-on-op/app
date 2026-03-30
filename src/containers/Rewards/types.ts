export interface RewardsReport {
    generatedAt: string
    periodDays: number
    totalDaysWithData: number
    globalAverages: GlobalAverages
    dailyReports: DailyReport[]
    users: AggregatedUser[]
}

export interface GlobalAverages {
    avgDailyRewardByToken: Record<string, number>
    avgBoostedPositions: number
    avgDailyStrategyTotals: StrategyTotalEntry[]
}

export interface StrategyTotalEntry {
    strategy: string
    token: string
    avgDailyTotal?: number
    totalReward?: number
}

export interface DailyReport {
    dayTimestamp: number
    date: string
    strategyTotals: StrategyTotalEntry[]
    totalRewardByToken: Record<string, number>
    totalBoostedPositions: number
    users: Record<string, DailyUserData>
}

export interface DailyUserData {
    dailyEarned: Record<string, number>
    dailyStrategyEarned: Record<string, Record<string, number>>
    dailyStrategyShare: Record<string, Record<string, number>>
    strategyPositions: Record<string, Record<string, StrategyPosition>>
    kiteStaked: number
    kiteShare: number
    boosts: Record<string, number>
    hasBoostedPosition: boolean
}

export interface StrategyPosition {
    avgWeight: number
    avgUnboostedWeight: number
    avgTotalWeight: number
    avgTotalUnboostedWeight: number
    avgPosition: number
    avgTotalPosition: number
    endOfDayWeight: number
    endOfDayBoost: number
    isDelayed: boolean
}

export interface AggregatedUser {
    address: string
    avgDailyEarnedByToken: Record<string, number>
    avgDailyStrategyEarned: Record<string, Record<string, number>>
    avgDailyStrategyShare: Record<string, Record<string, number>>
    avgKiteStaked: number
    avgKiteShare: number
    avgBoosts: Record<string, number>
    daysActive: number
}

import { type AnalyticsData } from '@hai-on-op/sdk'
import { TOKEN_LOGOS } from '~/utils/tokens'
import { SummaryCurrency, SummaryItemValue } from './vaults'

export type SystemSate = {
    currentRedemptionPrice: {
        value: string
    }
    currentRedemptionRate: {
        annualizedRate: string
    }
    globalDebt: string
    globalDebtCeiling: string
    perSafeDebtCeiling: string
}

export type TokenKey = keyof typeof TOKEN_LOGOS

export type EarnStrategyReward = {
    token: TokenKey
    emission: number
}
export type Strategy = {
    pair: [TokenKey] | [TokenKey, TokenKey]
    rewards: [EarnStrategyReward] | [EarnStrategyReward, EarnStrategyReward]
    tvl: string
    apy: number
    userPosition?: string
    strategyType: 'hold' | 'borrow' | 'farm'
} & (
    | {
          earnPlatform?: undefined
          earnAddress?: undefined
          earnLink?: undefined
      }
    | {
          earnPlatform: 'uniswap' | 'velodrome'
          earnAddress: string
          earnLink: string
      }
)

export type TokenAnalyticsData = AnalyticsData['tokenAnalyticsData'][string] & {
    symbol: string
    tokenContract?: string
    collateralJoin?: string
}

export type CollateralDebt = {
    debtAmount: string
    debtCeiling: string
    ceilingPercent: number
}

export type CollateralStat = {
    totalCollateral?: SummaryItemValue<SummaryCurrency>
    totalDebt?: SummaryItemValue<SummaryCurrency>
    ratio?: SummaryItemValue
    debt?: CollateralDebt
}

import { TOKEN_LOGOS } from '~/utils'

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

export type Strategy = {
    pair: [TokenKey] | [TokenKey, TokenKey],
    rewards: [TokenKey] | [TokenKey, TokenKey],
    tvl: string,
    vol24hr?: string,
    apy: number,
    userPosition?: string,
    userApy?: number,
    earnPlatform?: 'uniswap' | 'velodrome',
}

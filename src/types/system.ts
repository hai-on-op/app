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

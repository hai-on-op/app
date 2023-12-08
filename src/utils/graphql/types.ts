export type SystemState = {
    safeCount: string,
    globalDebt: string,
    totalActiveSafeCount: string,
    currentRedemptionPrice: {
        value: string
    }
}

export type CollateralPrice = {
    totalCollateral: string,
    currentPrice: {
        value: string
    }
}

export type HistoricalStats = {
    timestamp: string,
    marketPriceEth: string,
    marketPriceUsd: string,
    redemptionPrice: {
        value: string
    },
    redemptionRate: {
        perSecondRate: string,
        hourlyRate: string,
        eightHourlyRate: string,
        twentyFourHourlyRate: string,
        annualizedRate: string
    },
    globalDebt: string
}

export type RedemptionRate = {
    annualizedRate: string
}

export type QuerySafeCollateralType = {
    accumulatedRate: string,
    currentPrice: {
        value: string,
        liquidationPrice: string,
        collateral: {
            liquidationCRatio: string
        }
    },
    safeCount: string
}
export type QuerySafe = {
    id: string,
    safeId: string,
    collateral: string,
    debt: string,
    owner: {
        address: string
    },
    collateralType: QuerySafeCollateralType,
    saviour: {
        allowed: boolean
    }
}

export type SystemStateQueryData = {
    systemStates: SystemState[],
    collateralPrices: [CollateralPrice],
    dailyStats: [HistoricalStats],
    redemptionRates: [RedemptionRate],
    safes: [QuerySafe]
}

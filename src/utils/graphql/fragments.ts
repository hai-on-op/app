import { gql } from '@apollo/client'

export const CollateralPriceFragment = gql`
    fragment CollateralPriceFragment on CollateralPrice {
        timestamp
        safetyPrice
        liquidationPrice
        value
    }
`

export const CollateralTypeFragment = gql`
    fragment CollateralTypeFragment on CollateralType {
        id
        debtAmount
        totalCollateral
        totalCollateralLockedInSafes
        accumulatedRate
        unmanagedSafeCount
        safeCount
        stabilityFee
        totalAnnualizedStabilityFee
        debtCeiling
        debtFloor
        safetyCRatio
        liquidationCRatio
        liquidationPenalty
        collateralAuctionHouseAddress
        liquidationQuantity
        liquidationsStarted
        activeLiquidations
    }
`

export const CollateralPriceWithCollateralTypeFragment = gql`
    fragment CollateralPriceWithCollateralTypeFragment on CollateralPrice {
        ...CollateralPriceFragment
        collateral {
            ...CollateralTypeFragment
        }
    }
    ${CollateralPriceFragment}
    ${CollateralTypeFragment}
`

export const CollateralTypeWithCollateralPriceFragment = gql`
    fragment CollateralTypeWithCollateralPriceFragment on CollateralType {
        ...CollateralTypeFragment
        currentPrice {
            ...CollateralPriceFragment
        }
    }
    ${CollateralTypeFragment}
    ${CollateralPriceFragment}
`

export const SafeFragment = gql`
    fragment SafeFragment on Safe {
        safeId
        collateral
        debt
        cRatio
        owner {
            address
        }
        createdAt
        collateralType {
            id
            safetyCRatio
            liquidationCRatio
            currentPrice {
                timestamp
                safetyPrice
                liquidationPrice
                value
            }
        }
        saviour {
            allowed
        }
    }
`

export const RedemptionRateFragment = gql`
    fragment RedemptionRateFragment on RedemptionRate {
        perSecondRate
        eightHourlyRate
        twentyFourHourlyRate
        hourlyRate
        annualizedRate
    }
`

export const RedemptionPriceFragment = gql`
    fragment RedemptionPriceFragment on RedemptionPrice {
        timestamp
        redemptionRate
        value
    }
`

export const HourlyStatFragment = gql`
    fragment HourlyStatFragment on HourlyStat {
        timestamp
        redemptionRate {
            ...RedemptionRateFragment
        }
        redemptionPrice {
            ...RedemptionPriceFragment
        }
        marketPriceUsd
        marketPriceEth
        globalDebt
        erc20CoinTotalSupply
    }
    ${RedemptionRateFragment}
    ${RedemptionPriceFragment}
`

export const DailyStatFragment = gql`
    fragment DailyStatFragment on DailyStat {
        timestamp
        redemptionRate {
            ...RedemptionRateFragment
        }
        redemptionPrice {
            ...RedemptionPriceFragment
        }
        marketPriceUsd
        marketPriceEth
        globalDebt
        erc20CoinTotalSupply
    }
    ${RedemptionRateFragment}
    ${RedemptionPriceFragment}
`

export const SystemStateFragment = gql`
    fragment SystemStateFragment on SystemState {
        safeCount
        unmanagedSafeCount
        totalActiveSafeCount
        proxyCount
        globalDebt
        globalDebt24hAgo
        globalUnbackedDebt
        globalDebtCeiling
        perSafeDebtCeiling
        collateralCount
        globalStabilityFee
        savingsRate
        collateralAuctionCount
        currentRedemptionRate {
            ...RedemptionRateFragment
        }
        currentRedemptionPrice {
            ...RedemptionPriceFragment
        }
        erc20CoinTotalSupply
        systemSurplus
        debtAvailableToSettle
    }
    ${RedemptionRateFragment}
    ${RedemptionPriceFragment}
`

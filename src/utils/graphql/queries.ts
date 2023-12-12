import { gql } from '@apollo/client'
import {
    CollateralTypeWithCollateralPriceFragment,
    DailyStatFragment,
    HourlyStatFragment,
    SafeFragment,
} from './fragments'

// TODO: get refactored version with fragments working
export const SYSTEMSTATE_QUERY = gql`
    query GetSystemState {
        systemStates {
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
            erc20CoinTotalSupply
            systemSurplus
            debtAvailableToSettle
            currentRedemptionRate {
                perSecondRate
                eightHourlyRate
                twentyFourHourlyRate
                hourlyRate
                annualizedRate
            }
            currentRedemptionPrice {
                timestamp
                redemptionRate
                value
            }
        }
        collateralTypes {
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
            currentPrice {
                timestamp
                safetyPrice
                liquidationPrice
                value
            }
        }
        dailyStats(
            first: 1,
            orderBy: timestamp,
            orderDirection: desc
        ) {
            timestamp
            marketPriceUsd
            marketPriceEth
            globalDebt
            erc20CoinTotalSupply
        }
        redemptionRates(
            first: 1,
            orderBy: createdAt,
            orderDirection: desc
        ) {
            perSecondRate
            eightHourlyRate
            twentyFourHourlyRate
            hourlyRate
            annualizedRate
        }
        safes(first: 1) {
            safeId
            collateral
            debt
            owner {
                address
            }
            createdAt
            collateralType {
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
    }
`

export const ALLSAFES_QUERY_WITH_ZERO = gql`
    query GetAllSafes(
        $first: Int
        $skip: Int
        $orderBy: String
        $orderDirection: String
    ) {
        safes(
            first: $first
            skip: $skip
            orderBy: $orderBy
            orderDirection: $orderDirection
        ) { ...SafeFragment }
    }
    ${SafeFragment}
`

export const ALLSAFES_QUERY_NOT_ZERO = gql`
    query GetAllSafes(
        $first: Int
        $skip: Int
        $orderBy: String
        $orderDirection: String
    ) {
        safes(
            first: $first
            skip: $skip
            orderBy: $orderBy
            orderDirection: $orderDirection
            where: { collateral_not: "0" }
        ) { ...SafeFragment }
    }
    ${SafeFragment}
`

export const SAFE_QUERY = gql`
    query GetSafe($id: String) {
        safes(where: { safeId: $id }) { ...SafeFragment }
    }
    ${SafeFragment}
`

export const SAFE_ACTIVITY_QUERY = gql`
    query GetSafeActivity($id: String) {
        safe(id: $id) {
            modifySAFECollateralization(orderBy: createdAt, orderDirection: desc) {
                deltaDebt
                deltaCollateral
                createdAt
                createdAtTransaction
                accumulatedRate
            }
        }
    }
`

export const HOURLY_STATS_QUERY = gql`
    query HourlyStatsQuery($since: BigInt) {
        hourlyStats(
            orderBy: timestamp,
            orderDirection: desc,
            where: {
                timestamp_gt: $since
            }
        ) { ...HourlyStatFragment }
    }
    ${HourlyStatFragment}
`

export const DAILY_STATS_QUERY = gql`
    query DailyStats($since: BigInt) {
        dailyStats(
            orderBy: timestamp,
            orderDirection: desc,
            where:{
                timestamp_gt: $since
            }
        ) { ...DailyStatFragment }
    }
    ${DailyStatFragment}
`

export const ALL_COLLATERAL_TYPES_QUERY = gql`
    query AllCollateralTypes {
        collateralTypes(
            orderBy: id
        ) { ...CollateralTypeWithCollateralPriceFragment }
    }
    ${CollateralTypeWithCollateralPriceFragment}
`

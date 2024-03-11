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
        systemStates(
            first: 1,
            orderBy: createdAt,
            orderDirection: desc
        ) {
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
    }
`

export const ALLSAFES_QUERY_WITH_ZERO = gql`
    query GetAllSafes(
        $first: Int,
        $skip: Int,
        $orderBy: String,
        $orderDirection: String
    ) {
        safes(
            first: $first,
            skip: $skip,
            orderBy: $orderBy,
            orderDirection: $orderDirection,
            where: {
                safeId_not: null
            }
        ) {
            ...SafeFragment
        }
    }
    ${SafeFragment}
`
export const SAFES_BY_OWNER = gql`
    query SafesByOwner($address: Bytes!) {
        safes(
            where: {
                owner: $address,
                safeId_not: null
            }
        ) {
            ...SafeFragment
        }
    }
    ${SafeFragment}
`

export const ALLSAFES_QUERY_NOT_ZERO = gql`
    query GetAllSafes(
        $first: Int,
        $skip: Int,
        $orderBy: String,
        $orderDirection: String
    ) {
        safes(
            first: $first
            skip: $skip
            orderBy: $orderBy
            orderDirection: $orderDirection
            where: {
                collateral_not: "0",
                safeId_not: null
            }
        ) {
            ...SafeFragment
        }
    }
    ${SafeFragment}
`

export const SAFE_QUERY = gql`
    query GetSafe($id: String) {
        safes(
            where: {
                safeId: $id
            }
        ) {
            ...SafeFragment
            modifySAFECollateralization(
                orderBy: createdAt,
                orderDirection: desc
            ) {
                id
                deltaDebt
                deltaCollateral
                createdAt
                createdAtTransaction
                accumulatedRate
            }
        }
        confiscateSAFECollateralAndDebts(
            where: {
                safe_: {
                    safeId: $id
                }
            },
            orderBy: createdAt,
            orderDirection: desc
        ) {
            id
            deltaDebt
            deltaCollateral
            createdAt
            createdAtTransaction
        }
    }
    ${SafeFragment}
`

export const SAFE_ACTIVITY_QUERY = gql`
    query GetSafeActivity($id: String) {
        safe(id: $id) {
            modifySAFECollateralization(
                orderBy: createdAt,
                orderDirection: desc
            ) {
                id
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
        ) {
            ...HourlyStatFragment
        }
    }
    ${HourlyStatFragment}
`

export const DAILY_STATS_QUERY = gql`
    query DailyStats($since: BigInt) {
        dailyStats(
            orderBy: timestamp,
            orderDirection: desc,
            where: {
                timestamp_gt: $since
            }
        ) {
            ...DailyStatFragment
        }
    }
    ${DailyStatFragment}
`

export const ALL_COLLATERAL_TYPES_QUERY = gql`
    query AllCollateralTypes {
        collateralTypes(orderBy: id) {
            ...CollateralTypeWithCollateralPriceFragment
        }
    }
    ${CollateralTypeWithCollateralPriceFragment}
`

export const MY_AUCTION_BIDS_QUERY = gql`
    query MyBids($address: Bytes!) {
        englishAuctionBids(
            where: {
                bidder: $address
            }
        ) {
            id
            type
            auction {
                auctionId
                englishAuctionType
                sellToken
                winner
                isClaimed
                auctionDeadline
                englishAuctionBids {
                    id
                    bidNumber
                    type
                    sellAmount
                    buyAmount
                    price
                    bidder
                    createdAt
                }
            }
            sellAmount
            buyAmount
            price
            bidder
            owner
            createdAt
        }
    }
`

export const PROXY_OWNER_QUERY = gql`
    query ProxyOwner($address: Bytes!) {
        userProxies(
            where: { address: $address }
        ){
            id
            address
            owner {
                address
            }
        }
    }
`

export const AUCTION_RESTART_QUERY = gql`
    query AuctionRestarts {
        englishAuctions(
            where: { auctionRestartHashes_not: [] }
        ) {
            auctionId
            englishAuctionType
            auctionRestartHashes
            auctionRestartTimestamps
        }
    }
`

export const UNISWAP_PAIRS_QUERY = gql`
    query Pairs {
        uniswapPairs {
            address
            token0
            token1
            sqrtPriceX96
        }
    }
`

export const OPTIMISM_UNISWAP_POOL_QUERY = gql`
    query Pools($ids: [Bytes!]) {
        liquidityPools(
            where: {
                id_in: $ids
            }
        ) {
            id
            name
            inputTokens {
                symbol
            }
            totalValueLockedUSD
            inputTokenBalances
        }
    }
`

export const OPTIMISM_UNISWAP_POOL_WITH_POSITION_QUERY = gql`
    query Pools($ids: [Bytes!], $address: Bytes!) {
        liquidityPools(
            where: {
                id_in: $ids
            }
        ) {
            id
            name
            inputTokens {
                symbol
            }
            totalValueLockedUSD
            inputTokenBalances
            positions(
                where: {
                    account_: {
                        id: $address
                    }
                    hashClosed: null
                }
            ) {
                account {
                    id
                }
                cumulativeDepositUSD
                cumulativeDepositTokenAmounts
                cumulativeWithdrawUSD
                cumulativeWithdrawTokenAmounts
            }
        }
    }
`

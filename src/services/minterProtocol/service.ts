/**
 * Minter Protocol Service
 *
 * Centralized calculation helpers and utilities for minter protocols.
 * These functions are protocol-agnostic and accept configuration as a parameter.
 */

import type { MinterProtocolConfig } from '~/types/minterProtocol'

// ============================================================================
// Collateral Mapping
// ============================================================================

interface SafeData {
    owner: { address: string }
    collateral: string
}

/**
 * Calculate collateral mapping from safes data.
 * Groups all safes by owner and sums their collateral amounts.
 *
 * @param safesData - Array of safes with owner and collateral info
 * @returns Record mapping owner addresses to total collateral amounts
 */
export function calculateCollateralMapping(safesData: { safes?: SafeData[] }): Record<string, string> {
    const collateralMapping: Record<string, string> = {}

    if (safesData?.safes && safesData.safes.length > 0) {
        safesData.safes.forEach((safe) => {
            const ownerAddress = safe.owner.address.toLowerCase()
            const collateralAmount = parseFloat(safe.collateral)

            if (collateralMapping[ownerAddress]) {
                collateralMapping[ownerAddress] = (
                    parseFloat(collateralMapping[ownerAddress]) + collateralAmount
                ).toString()
            } else {
                collateralMapping[ownerAddress] = collateralAmount.toString()
            }
        })
    }

    return collateralMapping
}

// ============================================================================
// Boost Calculations
// ============================================================================

interface StakingData {
    stakedBalance: string | number
}

/**
 * Calculate boost map for all users.
 * Boost is based on (KITE ratio / protocol ratio) + 1, capped at 2x.
 *
 * @param collateralMapping - Per-user collateral amounts
 * @param usersStakingData - Per-user staking data
 * @param totalStakedAmount - Total staked amount across all users
 * @param totalDeposited - Total protocol tokens deposited
 * @returns Record mapping addresses to boost multipliers
 */
export function calculateBoostMap(
    collateralMapping: Record<string, string>,
    usersStakingData: Record<string, StakingData | undefined>,
    totalStakedAmount: number,
    totalDeposited: number
): Record<string, number> {
    return Object.entries(collateralMapping).reduce(
        (acc, [address, value]) => {
            if (!usersStakingData[address]) {
                return { ...acc, [address]: 1 }
            }

            const userStaked = Number(usersStakingData[address]?.stakedBalance || 0)
            const userDeposited = Number(value)

            // Boost formula: (kiteRatio / protocolRatio) + 1, capped at 2x
            const kiteRatio = isNaN(totalStakedAmount) || totalStakedAmount === 0 ? 0 : userStaked / totalStakedAmount
            const protocolRatio = totalDeposited === 0 ? 0 : userDeposited / totalDeposited
            const boostRaw = protocolRatio === 0 ? 1 : kiteRatio / protocolRatio + 1
            const boost = Math.min(boostRaw, 2)

            return { ...acc, [address]: boost }
        },
        {} as Record<string, number>
    )
}

/**
 * Calculate single-user boost.
 *
 * @param params - Calculation parameters
 * @returns Boost calculation result
 */
export function calculateUserBoost(params: {
    userStakingAmount: number
    totalStakingAmount: number
    userDeposited: string | number
    totalDeposited: string | number
}): { kiteRatio: number; boost: number } {
    const { userStakingAmount, totalStakingAmount, userDeposited, totalDeposited } = params

    if (userStakingAmount <= 0) {
        return { kiteRatio: 0, boost: 1 }
    }

    if (Number(totalDeposited) <= 0) {
        return { kiteRatio: 0, boost: 1 }
    }

    const kiteRatio = isNaN(totalStakingAmount) || totalStakingAmount === 0 ? 0 : userStakingAmount / totalStakingAmount
    const protocolRatio = Number(userDeposited) / Number(totalDeposited)
    const boostRaw = protocolRatio === 0 ? 1 : kiteRatio / protocolRatio + 1
    const boost = Math.min(boostRaw, 2)

    return { kiteRatio, boost }
}

// ============================================================================
// APR Calculations
// ============================================================================

/**
 * Compute boost APR for a minter protocol.
 *
 * @param params - APR calculation parameters
 * @returns APR calculation results
 */
export function computeBoostApr(params: {
    mapping: Record<string, string>
    boostMap: Record<string, number>
    protocolTokenPrice: number
    rewardTokenPrice: number
    latestTransferAmount: number // Raw reward amount over 7-day window
    userAddress?: string
}): {
    dailyRewardValue: number
    totalBoostedValueParticipating: number
    baseAPR: number
    myBoost: number
    myValueParticipating: number
    myBoostedValueParticipating: number
    myBoostedShare: number
    myBoostedAPR: number
} {
    const { mapping, boostMap, protocolTokenPrice, rewardTokenPrice, latestTransferAmount, userAddress } = params

    const dailyRewardQuantity = latestTransferAmount / 7 || 0
    const dailyRewardValue = dailyRewardQuantity * (rewardTokenPrice || 0)

    const totalBoostedQtyParticipating = Object.entries(mapping).reduce((acc, [address, value]) => {
        const boost = boostMap[address] || 1
        return acc + Number(value) * boost
    }, 0)
    const totalBoostedValueParticipating = totalBoostedQtyParticipating * (protocolTokenPrice || 0)

    const userAddr = userAddress?.toLowerCase()
    const myBoost = userAddr ? boostMap[userAddr] || 1 : 1
    const myValueParticipating = userAddr ? Number(mapping[userAddr] || 0) : 0
    const myBoostedValueParticipating = myValueParticipating * myBoost
    const myBoostedShare = totalBoostedValueParticipating
        ? myBoostedValueParticipating / totalBoostedValueParticipating
        : 0

    const baseAPRPercent =
        totalBoostedValueParticipating > 0 ? (dailyRewardValue / totalBoostedValueParticipating) * 365 * 100 : 0

    const myBoostedAPRPercent = myBoost * baseAPRPercent

    return {
        dailyRewardValue,
        totalBoostedValueParticipating,
        baseAPR: baseAPRPercent,
        myBoost,
        myValueParticipating,
        myBoostedValueParticipating,
        myBoostedShare,
        myBoostedAPR: myBoostedAPRPercent,
    }
}

// ============================================================================
// Deposit Aggregation
// ============================================================================

interface V1Safe {
    owner: { address: string }
    collateral: string
}

/**
 * Aggregate deposits from V1 safes and V2 balances.
 *
 * @param params - Aggregation parameters
 * @returns Combined mapping and totals
 */
export function aggregateDeposits(params: {
    v1Safes: V1Safe[]
    v2BalancesByUser?: Record<string, string>
    protocolTokenPriceUsd?: number
}): {
    mappingCombined: Record<string, string>
    v1Total: number
    v2Total: number
    totals: {
        v1TvlUsd: number
        v2TvlUsd: number
        totalTvlUsd: number
        v1TotalDeposited: number
        v2TotalDeposited: number
    }
} {
    const mappingCombined: Record<string, string> = {}
    let v1Total = 0
    let v2Total = 0

    for (const safe of params.v1Safes || []) {
        const owner = safe.owner.address.toLowerCase()
        const amt = Number(safe.collateral || '0')
        v1Total += amt
        mappingCombined[owner] = (Number(mappingCombined[owner] || '0') + amt).toString()
    }

    if (params.v2BalancesByUser) {
        for (const [ownerRaw, raw] of Object.entries(params.v2BalancesByUser)) {
            const owner = ownerRaw.toLowerCase()
            const amt = Number(raw || '0')
            v2Total += amt
            mappingCombined[owner] = (Number(mappingCombined[owner] || '0') + amt).toString()
        }
    }

    const price = Number(params.protocolTokenPriceUsd || 0)
    const v1TvlUsd = v1Total * price
    const v2TvlUsd = v2Total * price
    const totals = {
        v1TvlUsd,
        v2TvlUsd,
        totalTvlUsd: v1TvlUsd + v2TvlUsd,
        v1TotalDeposited: v1Total,
        v2TotalDeposited: v2Total,
    }

    return { mappingCombined, v1Total, v2Total, totals }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a collateral ID belongs to a minter protocol.
 *
 * @param config - Protocol configuration
 * @param collateralId - Collateral ID to check
 * @returns True if the collateral belongs to this protocol
 */
export function isProtocolCollateral(config: MinterProtocolConfig, collateralId: string): boolean {
    const upper = collateralId.toUpperCase()
    return config.collateral.v1Id?.toUpperCase() === upper || config.collateral.v2Id.toUpperCase() === upper
}

/**
 * Get all collateral IDs for a protocol.
 *
 * @param config - Protocol configuration
 * @returns Array of collateral IDs
 */
export function getProtocolCollateralIds(config: MinterProtocolConfig): string[] {
    const ids: string[] = []
    if (config.collateral.v1Id) {
        ids.push(config.collateral.v1Id)
    }
    ids.push(config.collateral.v2Id)
    return ids
}

/**
 * Check if a protocol supports V1 migration.
 *
 * @param config - Protocol configuration
 * @returns True if V1 migration is supported
 */
export function supportsV1Migration(config: MinterProtocolConfig): boolean {
    return config.features.supportsV1Migration && !!config.collateral.v1Id && !!config.tokens.wrappedTokenV1Symbol
}

/**
 * Get display label for a token type.
 *
 * @param config - Protocol configuration
 * @param tokenType - Token type ('BASE', 'VE_NFT', 'V1')
 * @returns Display label
 */
export function getTokenLabel(config: MinterProtocolConfig, tokenType: 'BASE' | 'VE_NFT' | 'V1'): string {
    switch (tokenType) {
        case 'BASE':
            return config.tokens.baseTokenSymbol
        case 'VE_NFT':
            return `ve${config.tokens.baseTokenSymbol}`
        case 'V1':
            return config.tokens.wrappedTokenV1Symbol || `${config.displayName} v1`
        default:
            return config.tokens.baseTokenSymbol
    }
}

// ============================================================================
// Reward Fetching Helper
// ============================================================================

/**
 * Fetch latest transfer amount for rewards calculation.
 * This is a wrapper that can be used by both haiVELO and haiAERO.
 *
 * @param params - Fetch parameters
 * @returns Latest transfer amount
 */
export async function fetchLatestTransferAmount(params: {
    config: MinterProtocolConfig
    haiTokenAddress: string
    depositerAddress?: string
    distributorAddress?: string
}): Promise<number> {
    const { config, haiTokenAddress, depositerAddress, distributorAddress } = params

    const effectiveDepositer = depositerAddress || config.rewards.depositerV1 || config.rewards.depositerV2
    const effectiveDistributor = distributorAddress || config.rewards.distributorV1 || config.rewards.distributorV2

    if (!effectiveDepositer || !effectiveDistributor) {
        return 0
    }

    try {
        const { RewardsModel } = await import('~/model/rewardsModel')
        const amount = await RewardsModel.fetchHaiVeloDailyReward({
            haiTokenAddress,
            haiVeloDepositer: effectiveDepositer,
            rewardDistributor: effectiveDistributor,
            rpcUrl: config.dataSources.rpcUrl,
        })
        return amount
    } catch {
        return 0
    }
}

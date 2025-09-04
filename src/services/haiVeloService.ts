/**
 * Centralized haiVELO (v1/v2) definitions and helpers
 *
 * Why this exists
 * - haiVELO v1 is already wired across many modules (staking, boost, rewards, APR, UI).
 * - With haiVELO v2, sprinkling more special-cases would make the code fragile and hard to evolve.
 * - This module provides a single source of truth for:
 *   - Addresses, symbols, and IDs used by v1/v2
 *   - Stateless helper functions to compute shared quantities (collateral mapping, boost maps, APR inputs)
 *   - Thin wrappers around data fetches so consumers don’t depend on implementation details
 *
 * What belongs here
 * - Anything “haiVELO-specific” that is reused in multiple places (addresses, id helpers, shared math)
 * - Functions that standardize inputs/outputs (so callers can be simpler and version-agnostic)
 *
 * Not in scope (yet)
 * - Side-effectful hooks or UI components. Keep this module framework-agnostic and testable.
 * - Version switching/aggregation policy (e.g., how to blend v1/v2 TVL). Expose data so policy can live in provider/hooks.
 */

import type {
    HaiVeloVersion,
    HaiVeloAddresses,
    HaiVeloBalances,
    HaiVeloTotals,
    HaiVeloBoost,
    HaiVeloAPR,
} from '~/types/haivelo'

// Token and contract addresses used across the app
// Note: Keep these as a single source of truth
/**
 * Canonical addresses used across the app.
 * Keep them here to avoid copy/paste and drift.
 */
export const VELO_TOKEN_ADDRESS: `0x${string}` = '0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db'
export const VE_NFT_CONTRACT_ADDRESS: `0x${string}` = '0xFAf8FD17D9840595845582fCB047DF13f006787d'
export const HAI_VELO_V2_TOKEN_ADDRESS: `0x${string}` = '0x20A7EaF4a922DF50b312ef61AeA8B6E1deb5DdD6' // 0xc00843e6e7574b2a633206f78fe95941c98652ab

// Reward distribution infra (currently v1 references)
/**
 * Rewards distribution infra (currently v1). If v2 gets separate infra,
 * add fields below and update wrappers to select appropriate values by version.
 */
export const HAIVELO_V1_DEPOSITER_ADDRESS: `0x${string}` = '0x7F4735237c41F7F8578A9C7d10A11e3BCFa3D4A3'
export const HAI_REWARD_DISTRIBUTOR_ADDRESS: `0x${string}` = '0xfEd2eB6325432F0bF7110DcE2CCC5fF811ac3D4D'

export const HAI_VELO_ADDRESSES: HaiVeloAddresses = {
    v1: {
        tokenSymbol: 'HAIVELO',
    },
    v2: {
        tokenAddress: HAI_VELO_V2_TOKEN_ADDRESS,
    },
    reward: {
        depositerV1: HAIVELO_V1_DEPOSITER_ADDRESS,
        distributorV1: HAI_REWARD_DISTRIBUTOR_ADDRESS,
    },
    other: {
        veloToken: VELO_TOKEN_ADDRESS,
        veNft: VE_NFT_CONTRACT_ADDRESS,
    },
}

/**
 * Helpers
 */
export function isHaiVeloCollateralId(id: string): boolean {
    const upper = id.toUpperCase()
    return upper === 'HAIVELO' || upper === 'HAIVELO_V2'
}

export function getHaiVeloCollateralIds(): string[] {
    // Subgraph currently exposes v1 as 'HAIVELO'. Extend this array when v2 is indexed
    return ['HAIVELO']
}

// Types moved to ~/types/haivelo

/**
 * ===== Calculation helpers (stateless) =====
 * These functions implement the “shared math” used by multiple consumers
 * (Earn, APR service, Manage views). Keeping them here prevents divergence
 * and simplifies adding v2.
 */
export function calculateHaiVeloCollateralMapping(haiVeloSafesData: any): Record<string, string> {
    /**
     * Why: We need a per-user map of haiVELO deposited to compute boost and shares.
     * What: Groups all safes by owner and sums their haiVELO collateral.
     * Input: raw subgraph response for safes on the HAIVELO collateral type.
     * Output: { [ownerLowercase]: totalHaiVeloCollateralString }
     */
    const collateralMapping: Record<string, string> = {}
    if (haiVeloSafesData?.safes && haiVeloSafesData.safes.length > 0) {
        haiVeloSafesData.safes.forEach((safe: any) => {
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

export function calculateHaiVeloBoostMap(
    haiVeloCollateralMapping: Record<string, string>,
    usersStakingData: any,
    totalStakedAmount: number,
    totalHaiVeloDeposited: number
): Record<string, number> {
    /**
     * Why: haiVELO rewards are boosted by KITE stake vs user’s share of haiVELO.
     * What: For each user, compute a multiplier based on (KITE ratio / haiVELO ratio) + 1, capped at 2x.
     * Notes: Mirrors boostService semantics to keep a consistent notion of “boost”.
     */
    return Object.entries(haiVeloCollateralMapping).reduce((acc, [address, value]) => {
        if (!usersStakingData[address]) return { ...acc, [address]: 1 }
        const userStaked = Number(usersStakingData[address]?.stakedBalance)
        const userDeposited = Number(value)
        // Simple boost formula alignment with existing implementation: (kiteRatio / haiVeloRatio) + 1, capped externally if needed
        const kiteRatio = isNaN(totalStakedAmount) || totalStakedAmount === 0 ? 0 : userStaked / totalStakedAmount
        const haiVeloRatio = totalHaiVeloDeposited === 0 ? 0 : userDeposited / totalHaiVeloDeposited
        const boostRaw = haiVeloRatio === 0 ? 1 : kiteRatio / haiVeloRatio + 1
        const boost = Math.min(boostRaw, 2)
        return { ...acc, [address]: boost }
    }, {} as Record<string, number>)
}

/**
 * Single-user haiVELO boost calculator (centralized definition)
 * Mirrors the logic used in calculateHaiVeloBoostMap for parity.
 */
export function calculateHaiVeloBoost(params: {
    userStakingAmount: number
    totalStakingAmount: number
    userHaiVELODeposited: string | number
    totalHaiVELODeposited: string | number
}): { kiteRatio: number; haiVeloBoost: number } {
    const { userStakingAmount, totalStakingAmount, userHaiVELODeposited, totalHaiVELODeposited } = params
    if (userStakingAmount <= 0) return { kiteRatio: 0, haiVeloBoost: 1 }
    if (Number(totalHaiVELODeposited) <= 0) return { kiteRatio: 0, haiVeloBoost: 1 }

    const kiteRatio = isNaN(totalStakingAmount) || totalStakingAmount === 0 ? 0 : userStakingAmount / totalStakingAmount
    const hvRatio = Number(userHaiVELODeposited) / Number(totalHaiVELODeposited)
    const boostRaw = hvRatio === 0 ? 1 : kiteRatio / hvRatio + 1
    const haiVeloBoost = Math.min(boostRaw, 2)
    return { kiteRatio, haiVeloBoost }
}

/**
 * Fetch latest transfer amount (raw HAI units) used for rewards → centralized wrapper
 * Why: Callers previously depended directly on RewardsModel and hardcoded addresses.
 * This wrapper centralizes both implementation and addresses, and makes it easy to
 * support a different distributor/depositer for v2 without touching every consumer.
 */
export async function fetchHaiVeloLatestTransferAmount(
    params: {
        rpcUrl: string
        haiTokenAddress: string
        depositerAddress?: string
        distributorAddress?: string
    }
): Promise<number> {
    const { rpcUrl, haiTokenAddress, depositerAddress = HAIVELO_V1_DEPOSITER_ADDRESS, distributorAddress = HAI_REWARD_DISTRIBUTOR_ADDRESS } = params
    const { RewardsModel } = await import('~/model/rewardsModel')
    try {
        const amount = await RewardsModel.fetchHaiVeloDailyReward({
            haiTokenAddress,
            haiVeloDepositer: depositerAddress,
            rewardDistributor: distributorAddress,
            rpcUrl,
        })
        return amount
    } catch {
        return 0
    }
}

export function computeHaiVeloBoostApr(params: {
    mapping: Record<string, string>
    boostMap: Record<string, number>
    haiVeloPrice: number
    haiPrice: number
    latestTransferAmount: number // raw HAI amount over 7 days window, divided by 7 externally if needed
    userAddress?: string
}) {
    /**
     * Why: Earn/Manage and APR service need the same set of derived quantities:
     * - total boosted value participating (denominator for APR)
     * - per-user boost/share metrics
     * - APR values (base vs boosted)
     * What: Computes these values from common inputs and returns a stable shape
     * compatible with existing consumers (e.g., useStrategyData.haiVelo.boostApr).
     */
    const { mapping, boostMap, haiVeloPrice, haiPrice, latestTransferAmount, userAddress } = params
    const haiVeloDailyRewardQuantity = latestTransferAmount / 7 || 0
    const haiVeloDailyRewardValue = haiVeloDailyRewardQuantity * (haiPrice || 0)

    const totalBoostedQtyParticipating = Object.entries(mapping).reduce((acc, [address, value]) => {
        const boost = boostMap[address as keyof typeof boostMap] || 1
        return acc + Number(value) * boost
    }, 0)
    const totalBoostedValueParticipating = totalBoostedQtyParticipating * (haiVeloPrice || 0)

    const userAddr = userAddress?.toLowerCase()
    const myBoost = userAddr ? boostMap[userAddr as keyof typeof boostMap] || 1 : 1
    const myValueParticipating = userAddr ? Number(mapping[userAddr as keyof typeof mapping] || 0) : 0
    const myBoostedValueParticipating = myValueParticipating * myBoost
    const myBoostedShare = totalBoostedValueParticipating
        ? myBoostedValueParticipating / totalBoostedValueParticipating
        : 0

    const baseAPRPercent = totalBoostedValueParticipating > 0
        ? (haiVeloDailyRewardValue / totalBoostedValueParticipating) * 365 * 100
        : 0

    const myBoostedAPRPercent = myBoost * baseAPRPercent

    return {
        haiVeloDailyRewardValue,
        totalBoostedValueParticipating,
        baseAPR: baseAPRPercent,
        myBoost,
        myValueParticipating,
        myBoostedValueParticipating,
        myBoostedShare,
        myBoostedAPR: myBoostedAPRPercent,
    }
}

// ===== Aggregation helpers (v1 + v2) =====
export function aggregateDeposits(params: {
    v1Safes: Array<{ owner: { address: string }; collateral: string }>
    v2BalancesByUser?: Record<string, string>
    haiVeloPriceUsd?: number
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

    const price = Number(params.haiVeloPriceUsd || 0)
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



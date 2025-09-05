/**
 * Boost Service
 *
 * Provides stateless functions for calculating boost values based on staking data
 * and LP positions.
 */

/**
 * Calculate LP boost value for a user
 *
 * @param userStakingAmount User's staked amount (KITE)
 * @param totalStakingAmount Total staked amount (KITE)
 * @param userLPPosition User's LP position amount
 * @param totalPoolLiquidity Total pool liquidity
 * @returns LP boost calculation values
 */
export function calculateLPBoost({
    userStakingAmount,
    totalStakingAmount,
    userLPPosition,
    totalPoolLiquidity,
}: {
    userStakingAmount: number
    totalStakingAmount: number
    userLPPosition: string | number
    totalPoolLiquidity: string | number
}) {
    // Skip calculation if user has no stake
    if (userStakingAmount <= 0) return { lpBoost: 1 }

    // Calculate KITE ratio
    const calculatedKiteRatio =
        isNaN(totalStakingAmount) || totalStakingAmount === 0 ? 0 : userStakingAmount / totalStakingAmount

    // Calculate LP boost
    const lpRatio = Number(totalPoolLiquidity) === 0 ? 0 : Number(userLPPosition) / Number(totalPoolLiquidity)

    const lpBoostRaw = lpRatio === 0 ? 1 : calculatedKiteRatio / lpRatio + 1
    const lpBoost = Math.min(lpBoostRaw, 2)

    return {
        kiteRatio: calculatedKiteRatio,
        lpBoost,
        lpBoostRaw,
    }
}

/**
 * Calculate haiVELO boost value for a user
 *
 * @param userStakingAmount User's staked amount (KITE)
 * @param totalStakingAmount Total staked amount (KITE)
 * @param userHaiVELODeposited User's haiVELO deposited amount
 * @param totalHaiVELODeposited Total haiVELO deposited
 * @returns haiVELO boost calculation values
 */
import { calculateHaiVeloBoost as centralizedHaiVeloBoost } from '~/services/haiVeloService'

export function calculateHaiVeloBoost({
    userStakingAmount,
    totalStakingAmount,
    userHaiVELODeposited,
    totalHaiVELODeposited,
}: {
    userStakingAmount: number
    totalStakingAmount: number
    userHaiVELODeposited: string | number
    totalHaiVELODeposited: string | number
}) {
    // Delegate to centralized implementation to ensure consistency
    return centralizedHaiVeloBoost({
        userStakingAmount,
        totalStakingAmount,
        userHaiVELODeposited,
        totalHaiVELODeposited,
    })
}

/**
 * Calculate vault boost value for a user
 *
 * @param userStakingAmount User's staked amount (KITE)
 * @param totalStakingAmount Total staked amount (KITE)
 * @param userVaultMinted User's vault minted amount
 * @param totalVaultMinted Total vault minted
 * @returns vault boost calculation values
 */
export function calculateVaultBoost({
    userStakingAmount,
    totalStakingAmount,
    userVaultMinted,
    totalVaultMinted,
}: {
    userStakingAmount: number
    totalStakingAmount: number
    userVaultMinted: string | number
    totalVaultMinted: string | number
}) {
    // Skip calculation if user has no stake
    if (userStakingAmount <= 0) return 1
    if (Number(totalVaultMinted) <= 0) return 1
    // Calculate KITE ratio
    const calculatedKiteRatio = userStakingAmount / totalStakingAmount
    // Calculate haiVELO boost
    const vaultRatio = Number(userVaultMinted) / Number(totalVaultMinted)
    const vaultBoostRaw = vaultRatio === 0 ? 1 : calculatedKiteRatio / vaultRatio + 1
    const vaultBoost = Math.min(vaultBoostRaw, 2)
    return vaultBoost
}

/**
 * Calculate HAI MINTING boost value for a user
 *
 * @param userStakingAmount User's staked amount (KITE)
 * @param totalStakingAmount Total staked amount (KITE)
 * @param userHaiMinted User's HAI minted amount
 * @param totalHaiMinted Total HAI minted amount
 * @returns HAI MINTING boost calculation values
 */
export function calculateHaiMintingBoost({
    userStakingAmount,
    totalStakingAmount,
    userHaiMinted,
    totalHaiMinted,
}: {
    userStakingAmount: number
    totalStakingAmount: number
    userHaiMinted: number
    totalHaiMinted: number
}) {
    // Skip calculation if user has no stake or no HAI minted
    if (userStakingAmount <= 0 || userHaiMinted <= 0 || totalHaiMinted <= 0) {
        return { haiMintingBoost: 1 }
    }

    // Calculate KITE ratio
    const calculatedKiteRatio = totalStakingAmount === 0 ? 0 : userStakingAmount / totalStakingAmount

    // Calculate HAI minting ratio
    const haiMintingRatio = userHaiMinted / totalHaiMinted

    // Calculate HAI MINTING boost: if user's minting ratio is higher than their staking ratio, they get a boost
    const haiMintingBoostRaw = haiMintingRatio === 0 ? 1 : calculatedKiteRatio / haiMintingRatio + 1
    const haiMintingBoost = Math.min(haiMintingBoostRaw, 2)

    return {
        kiteRatio: calculatedKiteRatio,
        haiMintingBoost,
    }
}

/**
 * Combine haiVELO and HAI MINTING boost values into a net boost value
 *
 * @param haiVeloBoost haiVELO boost value
 * @param haiMintingBoost HAI MINTING boost value
 * @param haiVeloPositionValue Value of user's haiVELO position in USD
 * @param haiMintingPositionValue Value of user's HAI MINTING position in USD
 * @returns Combined boost values
 */
export function combineBoostValues({
    haiVeloBoost,
    haiMintingBoost,
    haiVeloPositionValue,
    haiMintingPositionValue,
}: {
    haiVeloBoost: number
    haiMintingBoost: number
    haiVeloPositionValue: string | number
    haiMintingPositionValue: string | number
}) {
    // Calculate weighted average boost (excluding LP boost)
    const totalValue = Number(haiVeloPositionValue) + Number(haiMintingPositionValue)
    const haiVeloValueRatio = totalValue === 0 ? 0.5 : Number(haiVeloPositionValue) / totalValue
    const haiMintingValueRatio = totalValue === 0 ? 0.5 : Number(haiMintingPositionValue) / totalValue

    const weightedHaiVeloBoost = haiVeloBoost * haiVeloValueRatio
    const weightedHaiMintingBoost = haiMintingBoost * haiMintingValueRatio

    const netBoost = weightedHaiVeloBoost + weightedHaiMintingBoost

    return {
        haiVeloBoost,
        haiMintingBoost,
        haiVeloValueRatio,
        haiMintingValueRatio,
        netBoost,
    }
}

/**
 * Calculate all boost values for a user
 *
 * @param userStakingAmount User's staked amount (KITE)
 * @param totalStakingAmount Total staked amount (KITE)
 * @param userLPPosition User's LP position amount
 * @param totalPoolLiquidity Total pool liquidity
 * @param userHaiVELODeposited User's haiVELO deposited amount
 * @param totalHaiVELODeposited Total haiVELO deposited
 * @param haiVeloPositionValue Value of user's haiVELO position in USD
 * @returns Boost calculation values
 */
export function calculateBoostValues({
    userStakingAmount,
    totalStakingAmount,
    userLPPosition,
    totalPoolLiquidity,
    userHaiVELODeposited,
    totalHaiVELODeposited,
    haiVeloPositionValue,
}: {
    userStakingAmount: number
    totalStakingAmount: number
    userLPPosition: string | number
    totalPoolLiquidity: string | number
    userHaiVELODeposited: string | number
    totalHaiVELODeposited: string | number
    haiVeloPositionValue: string | number
}) {
    // Skip calculation if user has no stake
    if (userStakingAmount <= 0) return { netBoost: 1 }

    // Calculate LP boost using the new function
    const lpBoostResult = calculateLPBoost({
        userStakingAmount,
        totalStakingAmount,
        userLPPosition,
        totalPoolLiquidity,
    })

    // Calculate haiVELO boost using the new function
    const haiVeloBoostResult = calculateHaiVeloBoost({
        userStakingAmount,
        totalStakingAmount,
        userHaiVELODeposited,
        totalHaiVELODeposited,
    })

    // Combine the results using the new function
    const combinedResult = combineBoostValues({
        haiVeloBoost: haiVeloBoostResult.haiVeloBoost,
        haiMintingBoost: 1, // Default to 1 for now, will be updated when HAI MINTING is added
        haiVeloPositionValue,
        haiMintingPositionValue: 0, // Default to 0 for now, will be updated when HAI MINTING is added
    })

    return {
        kiteRatio: lpBoostResult.kiteRatio, // Both functions calculate the same kiteRatio
        ...combinedResult,
    }
}

/**
 * Simulate net boost for a hypothetical staking amount
 *
 * @param userAfterStakingAmount User's staking amount after hypothetical action
 * @param totalAfterStakingAmount Total staking amount after hypothetical action
 * @param userHaiVELODeposited User's haiVELO deposited amount
 * @param totalHaiVELODeposited Total haiVELO deposited
 * @param haiVeloPositionValue Value of user's haiVELO position in USD
 * @param userHaiAmount User's HAI amount for HAI HOLD boost calculation
 * @param totalHaiAmount Total HAI amount for HAI HOLD boost calculation
 * @param haiHoldPositionValue Value of user's HAI HOLD position in USD
 * @returns Simulated net boost value
 */
export function simulateNetBoost({
    userAfterStakingAmount,
    totalAfterStakingAmount,
    userHaiVELODeposited,
    totalHaiVELODeposited,
    haiVeloPositionValue,
    userHaiAmount = 0,
    totalHaiAmount = 0,
    haiHoldPositionValue = 0,
}: {
    userAfterStakingAmount: number
    totalAfterStakingAmount: number
    userHaiVELODeposited: string | number
    totalHaiVELODeposited: string | number
    haiVeloPositionValue: string | number
    userHaiAmount?: number
    totalHaiAmount?: number
    haiHoldPositionValue?: number
}) {
    // Calculate LP boost with simulated staking amounts
    // const lpBoostResult = calculateLPBoost({
    //     userStakingAmount: userAfterStakingAmount,
    //     totalStakingAmount: totalAfterStakingAmount,
    //     userLPPosition,
    //     totalPoolLiquidity,
    // })

    // Calculate haiVELO boost with simulated staking amounts
    const haiVeloBoostResult = calculateHaiVeloBoost({
        userStakingAmount: userAfterStakingAmount,
        totalStakingAmount: totalAfterStakingAmount,
        userHaiVELODeposited,
        totalHaiVELODeposited,
    })

    // Calculate HAI MINTING boost with simulated staking amounts
    const haiMintingBoostResult = calculateHaiMintingBoost({
        userStakingAmount: userAfterStakingAmount,
        totalStakingAmount: totalAfterStakingAmount,
        userHaiMinted: userHaiAmount, // Using userHaiAmount as userHaiMinted for now
        totalHaiMinted: totalHaiAmount, // Using totalHaiAmount as totalHaiMinted for now
    })

    // Combine the boost values
    const combinedResult = combineBoostValues({
        haiVeloBoost: haiVeloBoostResult.haiVeloBoost,
        haiMintingBoost: haiMintingBoostResult.haiMintingBoost,
        haiVeloPositionValue,
        haiMintingPositionValue: haiHoldPositionValue, // Using haiHoldPositionValue as haiMintingPositionValue for now
    })

    return combinedResult.netBoost
}

/**
 * Calculate base APR based on daily rewards and position values
 *
 * @param totalDailyRewardsInUSD Total daily rewards in USD
 * @param haiVeloPositionValue Value of user's haiVELO position in USD
 * @param userLPPositionValue Value of user's LP position in USD
 * @returns Base APR as a percentage
 */
export function calculateBaseAPR({
    totalDailyRewardsInUSD,
    haiVeloPositionValue,
    userLPPositionValue,
}: {
    totalDailyRewardsInUSD: number
    haiVeloPositionValue: string | number
    userLPPositionValue: string | number
}) {
    if (Number(haiVeloPositionValue) + Number(userLPPositionValue) === 0) return 0
    return (totalDailyRewardsInUSD / (Number(haiVeloPositionValue) + Number(userLPPositionValue))) * 365 * 100
}

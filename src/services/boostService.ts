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
    // Skip calculation if user has no stake
    if (userStakingAmount <= 0) return { haiVeloBoost: 1 }
    if (Number(totalHaiVELODeposited) <= 0) return { haiVeloBoost: 1 }

    // Calculate KITE ratio
    const calculatedKiteRatio =
        isNaN(totalStakingAmount) || totalStakingAmount === 0 ? 0 : userStakingAmount / totalStakingAmount

    // Calculate haiVELO boost
    const haiVeloRatio = Number(userHaiVELODeposited) / Number(totalHaiVELODeposited)
    const haiVeloBoostRaw = haiVeloRatio === 0 ? 1 : calculatedKiteRatio / haiVeloRatio + 1
    const haiVeloBoost = Math.min(haiVeloBoostRaw, 2)

    return {
        kiteRatio: calculatedKiteRatio,
        haiVeloBoost,
    }
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
 * Calculate HAI HOLD boost value for a user
 *
 * @param userStakingAmount User's staked amount (KITE)
 * @param totalStakingAmount Total staked amount (KITE)
 * @param userHaiAmount User's HAI amount
 * @param totalHaiAmount Total HAI supply
 * @returns HAI HOLD boost calculation values
 */
export function calculateHaiHoldBoost({
    userStakingAmount,
    totalStakingAmount,
    userHaiAmount,
    totalHaiAmount,
}: {
    userStakingAmount: number
    totalStakingAmount: number
    userHaiAmount: number
    totalHaiAmount: number
}) {
    // Skip calculation if user has no stake or no HAI
    if (userStakingAmount <= 0 || userHaiAmount <= 0 || totalHaiAmount <= 0) {
        return { haiHoldBoost: 1 }
    }

    // Calculate KITE ratio
    const calculatedKiteRatio = totalStakingAmount === 0 ? 0 : userStakingAmount / totalStakingAmount

    // Calculate HAI ratio
    const haiRatio = userHaiAmount / totalHaiAmount

    // Calculate HAI HOLD boost: if user's HAI ratio is higher than their staking ratio, they get a boost
    const haiHoldBoostRaw = haiRatio === 0 ? 1 : calculatedKiteRatio / haiRatio + 1
    const haiHoldBoost = Math.min(haiHoldBoostRaw, 2)

    return {
        kiteRatio: calculatedKiteRatio,
        haiHoldBoost,
    }
}

/**
 * Combine LP, haiVELO, and HAI HOLD boost values into a net boost value
 *
 * @param lpBoost LP boost value
 * @param haiVeloBoost haiVELO boost value
 * @param haiHoldBoost HAI HOLD boost value
 * @param userLPPositionValue Value of user's LP position in USD
 * @param haiVeloPositionValue Value of user's haiVELO position in USD
 * @param haiHoldPositionValue Value of user's HAI HOLD position in USD
 * @returns Combined boost values
 */
export function combineBoostValues({
    lpBoost,
    haiVeloBoost,
    haiHoldBoost,
    userLPPositionValue,
    haiVeloPositionValue,
    haiHoldPositionValue,
}: {
    lpBoost: number
    haiVeloBoost: number
    haiHoldBoost: number
    userLPPositionValue: string | number
    haiVeloPositionValue: string | number
    haiHoldPositionValue: string | number
}) {
    // Calculate weighted average boost
    const totalValue = Number(userLPPositionValue) + Number(haiVeloPositionValue) + Number(haiHoldPositionValue)
    const haiVeloValueRatio = totalValue === 0 ? 0.33 : Number(haiVeloPositionValue) / totalValue
    const lpValueRatio = totalValue === 0 ? 0.33 : Number(userLPPositionValue) / totalValue
    const haiHoldValueRatio = totalValue === 0 ? 0.34 : Number(haiHoldPositionValue) / totalValue


    console.log({
        values: {
            totalValue,
            haiVeloPositionValue,
            userLPPositionValue,
            haiHoldPositionValue,
        },
        ratios: {
            haiVeloValueRatio,
            lpValueRatio,
            haiHoldValueRatio,
        },
        boosts: {
            haiVeloBoost,
            lpBoost,
            haiHoldBoost,
        },
    })

    console.log('haiVeloBoost is: ', haiVeloBoost)
    console.log('haiVeloValueRatio is: ', haiVeloValueRatio)
    console.log('lpBoost is: ', lpBoost)
    console.log('lpValueRatio is: ', lpValueRatio)
    console.log('haiHoldBoost is: ', haiHoldBoost)
    console.log('haiHoldValueRatio is: ', haiHoldValueRatio)

    const weightedHaiVeloBoost = haiVeloBoost * haiVeloValueRatio
    const weightedLpBoost = lpBoost * lpValueRatio
    const weightedHaiHoldBoost = haiHoldBoost * haiHoldValueRatio

    const netBoost = weightedHaiVeloBoost + weightedLpBoost + weightedHaiHoldBoost

    return {
        haiVeloBoost,
        lpBoost,
        haiHoldBoost,
        haiVeloValueRatio,
        lpValueRatio,
        haiHoldValueRatio,
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
 * @param userLPPositionValue Value of user's LP position in USD
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
    userLPPositionValue,
    userHaiVELODeposited,
    totalHaiVELODeposited,
    haiVeloPositionValue,
}: {
    userStakingAmount: number
    totalStakingAmount: number
    userLPPosition: string | number
    totalPoolLiquidity: string | number
    userLPPositionValue: string | number
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
        lpBoost: lpBoostResult.lpBoost,
        haiVeloBoost: haiVeloBoostResult.haiVeloBoost,
        haiHoldBoost: 1, // Default to 1 for now, will be updated when HAI HOLD is added
        userLPPositionValue,
        haiVeloPositionValue,
        haiHoldPositionValue: 0, // Default to 0 for now, will be updated when HAI HOLD is added
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
 * @param userLPPosition User's LP position amount
 * @param totalPoolLiquidity Total pool liquidity
 * @param userLPPositionValue Value of user's LP position in USD
 * @param userHaiVELODeposited User's haiVELO deposited amount
 * @param totalHaiVELODeposited Total haiVELO deposited
 * @param haiVeloPositionValue Value of user's haiVELO position in USD
 * @returns Simulated net boost value
 */
export function simulateNetBoost({
    userAfterStakingAmount,
    totalAfterStakingAmount,
    userLPPosition,
    totalPoolLiquidity,
    userLPPositionValue,
    userHaiVELODeposited,
    totalHaiVELODeposited,
    haiVeloPositionValue,
}: {
    userAfterStakingAmount: number
    totalAfterStakingAmount: number
    userLPPosition: string | number
    totalPoolLiquidity: string | number
    userLPPositionValue: string | number
    userHaiVELODeposited: string | number
    totalHaiVELODeposited: string | number
    haiVeloPositionValue: string | number
}) {
    // Calculate LP boost with simulated staking amounts
    const lpBoostResult = calculateLPBoost({
        userStakingAmount: userAfterStakingAmount,
        totalStakingAmount: totalAfterStakingAmount,
        userLPPosition,
        totalPoolLiquidity,
    })

    // Calculate haiVELO boost with simulated staking amounts
    const haiVeloBoostResult = calculateHaiVeloBoost({
        userStakingAmount: userAfterStakingAmount,
        totalStakingAmount: totalAfterStakingAmount,
        userHaiVELODeposited,
        totalHaiVELODeposited,
    })

    // Combine the boost values
    const combinedResult = combineBoostValues({
        lpBoost: lpBoostResult.lpBoost,
        haiVeloBoost: haiVeloBoostResult.haiVeloBoost,
        haiHoldBoost: 1, // Default to 1 for now, will be updated when HAI HOLD is added
        userLPPositionValue,
        haiVeloPositionValue,
        haiHoldPositionValue: 0, // Default to 0 for now, will be updated when HAI HOLD is added
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

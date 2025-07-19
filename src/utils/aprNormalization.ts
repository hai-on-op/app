// Types duplicated for this utility
interface Strategy {
    apr: number | string
    boostAPR?: {
        baseAPR: number
        myBoostedAPR: number
        [key: string]: any
    }
    strategyType: 'farm' | 'borrow' | 'hold' | 'stake' | 'deposit'
    [key: string]: any
}

interface EffectiveAPR {
    apr: number
    boostedApr: number
}

/**
 * Normalize APR values to percentage format for consistent sorting and display
 * @param aprValue - The raw APR value
 * @param strategyType - The type of strategy (farm, borrow, hold, stake, deposit)
 * @returns Normalized APR value in percentage format
 */
export function normalizeAPRValue(aprValue: number, strategyType: string): number {
    // Farm strategies (Velodrome) store APR as decimal, convert to percentage
    if (strategyType === 'farm') {
        return aprValue * 100
    }
    // Borrow strategies already store APR as percentage - no conversion needed
    // Hold/Stake strategies need to be checked - they might be in decimal format
    else if (strategyType === 'hold' || strategyType === 'stake') {
        // If the value is less than 1, it's likely in decimal format
        if (aprValue < 1) {
            return aprValue * 100
        }
    }
    // For other strategy types or if no conversion needed, return as-is
    return aprValue
}

/**
 * Get the effective APR from a strategy, handling both boosted and regular APR
 * @param strategy - The strategy object
 * @returns Object containing both regular and boosted APR values
 */
export function getEffectiveAPR(strategy: Strategy): EffectiveAPR {
    const apr = strategy.boostAPR ? Number(strategy.boostAPR.baseAPR) : Number(strategy.apr)
    const boostedApr = strategy.boostAPR ? Number(strategy.boostAPR.myBoostedAPR) : 0
    
    return {
        apr,
        boostedApr
    }
}

/**
 * Get the best APR value for a strategy, prioritizing boosted APR if available
 * @param strategy - The strategy object  
 * @returns The best available APR value
 */
export function getBestAPRValue(strategy: Strategy): number {
    // For strategies with boostAPR, use the boosted APR
    if (strategy.boostAPR && strategy.boostAPR.myBoostedAPR) {
        return strategy.boostAPR.myBoostedAPR
    } else {
        // For other strategies, use the apr field
        return Number(strategy.apr)
    }
} 
import type { BoostAPRData } from '~/types/system'

// Factory strategy interface - more flexible than the strict Strategy type
interface BaseStrategy {
    pair: string[]
    tvl: number | string
    apr: number | string
    userPosition: number | string
    strategyType: 'borrow' | 'hold' | 'deposit' | 'stake' | 'farm'
    rewards?: Array<{ token: string; emission: number }>
    boostAPR?: BoostAPRData
    boostEligible?: boolean
    collateral?: string
    earnPlatform?: 'uniswap' | 'velodrome'
    earnAddress?: string
    earnLink?: string
}

interface VaultStrategyParams {
    pair: string[]
    collateral: string
    rewards: Array<{ token: string; emission: number }>
    tvl: number
    boostAPR: BoostAPRData
    userPosition: number
}

interface SpecialStrategyParams {
    pair: string[]
    tvl: number
    apr: number
    userPosition: number
    strategyType: 'hold' | 'deposit' | 'stake'
    boostAPR?: BoostAPRData
    boostEligible?: boolean
    earnLink?: string
}

interface VeloStrategyParams {
    pair: string[]
    rewards: Array<{ token: string; emission: number }>
    tvl: number
    apr: number
    userPosition: number
    earnAddress: string
    earnLink: string
}

/**
 * Create a base strategy object with common properties
 */
export function createBaseStrategy(
    pair: string[],
    tvl: number,
    apr: number | string,
    userPosition: number,
    strategyType: BaseStrategy['strategyType']
): BaseStrategy {
    return {
        pair,
        tvl,
        apr,
        userPosition,
        strategyType,
    }
}

/**
 * Create a vault/borrow strategy
 */
export function createVaultStrategy(params: VaultStrategyParams): BaseStrategy {
    return {
        ...createBaseStrategy(params.pair, params.tvl, '0', params.userPosition, 'borrow'),
        collateral: params.collateral,
        rewards: params.rewards,
        boostAPR: params.boostAPR,
        boostEligible: true,
    }
}

/**
 * Create a special strategy (HAI hold, HAIVELO deposit, KITE stake)
 */
export function createSpecialStrategy(params: SpecialStrategyParams): BaseStrategy {
    const strategy = createBaseStrategy(
        params.pair,
        params.tvl,
        params.apr,
        params.userPosition,
        params.strategyType
    )

    return {
        ...strategy,
        rewards: [],
        ...(params.boostAPR && { boostAPR: params.boostAPR }),
        ...(params.boostEligible !== undefined && { boostEligible: params.boostEligible }),
        ...(params.earnLink && { earnLink: params.earnLink }),
    }
}

/**
 * Create a Velodrome farm strategy
 */
export function createVeloStrategy(params: VeloStrategyParams): BaseStrategy {
    return {
        ...createBaseStrategy(params.pair, params.tvl, params.apr, params.userPosition, 'farm'),
        rewards: params.rewards,
        earnPlatform: 'velodrome',
        earnAddress: params.earnAddress,
        earnLink: params.earnLink,
    }
} 
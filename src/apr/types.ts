import type { BigNumber } from 'ethers'

/** All APR values in the APR provider are normalized to decimal: 0.05 means 5% */
export type DecimalAPR = number

export type AprSource =
    | 'redemption-rate'
    | 'hai-rewards'
    | 'kite-incentives'
    | 'staking-rewards'
    | 'underlying-yield'
    | 'trading-fees'
    | 'velo-emissions'

export type StrategyType = 'hold' | 'deposit' | 'stake' | 'borrow' | 'farm'

export interface AprComponent {
    source: AprSource
    apr: DecimalAPR
    boosted: boolean
    label: string
}

export interface BoostData {
    myBoost: number
    baseApr: DecimalAPR
    boostedApr: DecimalAPR
    totalBoostedValueParticipating: number
    myValueParticipating: number
    myBoostedValueParticipating: number
    myBoostedShare: number
}

/** A token held or staked as part of a position */
export interface PositionToken {
    symbol: string
    totalAmount: number // total in the pool / strategy
    userAmount: number // user's amount
    priceUsd: number
    totalValueUsd: number
    userValueUsd: number
}

/** A reward token emitted by a strategy */
export interface RewardToken {
    symbol: string
    dailyEmission: number // tokens / day distributed to the whole pool
    priceUsd: number
    dailyValueUsd: number // dailyEmission × priceUsd
    annualValueUsd: number
}

export interface StrategyAprResult {
    id: string
    type: StrategyType
    pair: string[]
    baseApr: DecimalAPR
    components: AprComponent[]
    boost: BoostData | null
    effectiveApr: DecimalAPR
    tvl: number
    userPosition: number
    rewards: Array<{ token: string; emission: number }>
    /** Detailed breakdown of position tokens (what you hold / stake) */
    positionTokens: PositionToken[]
    /** Detailed breakdown of reward tokens (what you earn) */
    rewardTokens: RewardToken[]
    /**
     * Net APR for vault/borrow strategies.
     * Blends: (collateralValue × underlyingYield + debtValue × (incentivesAPR - stabilityFee)) / totalPosition
     * Assumes 200% collateral ratio when user has no open vault.
     * Undefined for non-vault strategies (use effectiveApr instead).
     */
    netApr?: DecimalAPR
    /** Underlying collateral yield (e.g., Beefy auto-compound, wstETH staking, Lido) */
    underlyingApr?: DecimalAPR
    /** Annual stability fee cost as a positive decimal (e.g., 0.02 = 2% fee) */
    stabilityFee?: DecimalAPR
    loading: boolean
    error?: string
}

export interface AprContextValue {
    strategies: Record<string, StrategyAprResult>
    getStrategy(id: string): StrategyAprResult | undefined
    getBaseApr(id: string): DecimalAPR
    getEffectiveApr(id: string): DecimalAPR
    getBoost(id: string): BoostData | null
    getAllByType(type: StrategyType): StrategyAprResult[]
    loading: boolean
    error: string | null
}

// ===== Input types for the orchestrator =====

export interface PriceMap {
    hai: number
    kite: number
    velo: number
    op: number
    aero: number
}

export interface CollateralTypeData {
    id: string
    debtAmount: string
    currentPrice?: { value: string }
}

export interface MinterVaultData {
    userDebtMapping: Record<string, string>
    totalMinted: string
}

export interface VelodromePoolInput {
    address: string
    emissions: string
    decimals: number
    reserve0: string
    reserve1: string
    token0: string
    token1: string
    tokenPair: [string, string]
    type: string
    token0_fees?: string
    token1_fees?: string
    liquidity?: string
}

export interface VelodromePositionInput {
    lp: string
    staked0: string
    staked1: string
}

export interface LpPoolInput {
    totalStakedLp: number
    userStakedLp: number
    lpPriceUsd: number
    dailyKiteReward: number
}

export interface CurveLpInput extends LpPoolInput {
    curveVApy: number
}

export interface VelodromeLpInput extends LpPoolInput {
    tradingFeeApr: number
    haiRewardsApr: number
    poolTvlUsd: number // full pool TVL (all LP holders), NOT just staked portion
}

export interface AprInputs {
    prices: PriceMap

    // System state
    redemptionRateAnnualized: number
    erc20CoinTotalSupply: number

    // User
    userAddress?: string
    userHaiBalance: number

    // Collateral data
    collateralTypes: CollateralTypeData[]

    // Staking data
    totalKiteStaked: number
    userKiteStaked: number
    stakingRewardRates: Array<{ rpToken: string; rpRate: BigNumber }>
    tokenPricesByAddress: Record<string, number>

    // haiVELO deposit data
    haiVeloCollateralMapping: Record<string, string>
    haiVeloBoostMap: Record<string, number>
    haiVeloPrice: number
    weeklyHaiRewardForHaiVelo: number

    // haiAERO deposit data
    haiAeroCollateralMapping: Record<string, string>
    haiAeroBoostMap: Record<string, number>
    haiAeroPrice: number
    weeklyHaiRewardForHaiAero: number

    // LP staking data
    haiBoldLp: CurveLpInput
    haiVeloVeloLp: VelodromeLpInput

    // Vault data
    minterVaults: Record<string, MinterVaultData>
    vaultRewards: Record<string, { KITE: number; OP: number }>

    // Per-collateral underlying APR (from external protocols: Lido, Beefy, Yearn, etc.)
    underlyingAprs: Record<string, number> // collateral id -> decimal APR
    // Per-collateral annual stability fee (from liquidation data)
    stabilityFees: Record<string, number> // collateral id -> decimal fee (positive)

    // Velodrome farm data
    velodromePools: VelodromePoolInput[]
    velodromePositions: VelodromePositionInput[]

    // Token data for pool symbol resolution
    tokensData: Record<string, { symbol?: string }>
}

// Rewards domain shared types

export const REWARD_TOKENS = ['KITE', 'OP', 'DINERO', 'HAI'] as const
export type RewardToken = (typeof REWARD_TOKENS)[number]

// Address and numeric string aliases
export type Address = `0x${string}`
export type WeiString = string
export type UsdNumber = number
export type BasisPointsNumber = number

// Staking APY item returned from on-chain reward pools
export interface StakingApyItem {
    id: number
    rpToken: Address
    rpRateWei: WeiString
}

// Aggregated user rewards by token address
export interface AggregatedReward {
    tokenAddress: Address
    amountWei: WeiString
}

// Minimal transaction response shape used by claim flows
export interface TransactionResponseLike {
    hash: string
    from: string
    chainId?: number
}

// Incentive claim data for merkle-based distributor
export interface IncentiveClaimData {
    token: RewardToken
    amountWei: WeiString
    hasClaimable: boolean
    claim: () => Promise<TransactionResponseLike | void | null>
    claimAll?: () => Promise<TransactionResponseLike | void | null>
}

// Static/dynamic reward schedule for a vault or pool
export interface VaultRewardSchedule {
    token: RewardToken
    dailyAmount: number
}

// Generic boost APR result
export interface BoostAprResult {
    baseAprPct: number
    myBoost: number
    myBoostedAprPct: number
    totals: {
        boostedValueUsd: number
    }
}

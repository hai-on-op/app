export type Address = `0x${string}`

export type RewardTokenMeta = {
    address: Address
    symbol: string
    icon?: string
    decimals?: number
}

export type ClaimMap = Array<{ tokenAddress: Address; amount: string }>

export type StakingUserEntity = 'stakingUser' | 'haiBoldCurveLPStakingUser' | 'haiVeloVeloLPStakingUser'

export type StakingStatsEntity = 'stakingStatistic' | 'haiBoldCurveLPStakingStatistic' | 'haiVeloVeloLPStakingStatistic'

export type RewardModule = {
    getClaims: (p: { account: Address; provider: any }) => Promise<ClaimMap>
    getTimer?: (p: { provider: any }) => Promise<{ endTime: number; paused: boolean }>
    claimTx?: (p: { signer: any }) => Promise<any>
    tokensMeta?: RewardTokenMeta[]
    Panel?: React.ComponentType<{ config: StakingConfig; account?: Address }>
}

export type LpTvlSource = 'curve' | 'velodrome'

export type LpTvlMetadata = {
    source: LpTvlSource
    /**
     * Optional on-chain pool address (Curve/Velodrome LP token or pool).
     * This is reserved for future TVL integrations.
     */
    poolAddress?: Address
    /**
     * Optional protocol-specific pool identifier (e.g. Curve pool id).
     * This is reserved for future TVL integrations.
     */
    poolId?: string
    /**
     * Optional label override for the LP TVL stat.
     */
    label?: string
}

export type StakingConfig = {
    namespace: string
    labels: {
        token: string
        stToken?: string
        stakeVerb?: string
    }
    addresses: {
        stakeToken: Address
        stToken?: Address
        manager: Address
    }
    decimals: number
    cooldownSeconds?: number
    affectsBoost: boolean
    /**
     * Optional metadata describing the underlying LP pool for TVL calculations.
     */
    tvl?: LpTvlMetadata
    subgraph: {
        poolKey: string
        userEntity: StakingUserEntity
        statsEntity: StakingStatsEntity
        idForUser: (addr: string) => string
        idForStats: () => string
    }
    rewards: RewardModule
}

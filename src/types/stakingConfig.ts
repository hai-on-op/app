export type Address = `0x${string}`

export type RewardTokenMeta = {
    address: Address
    symbol: string
    icon?: string
    decimals?: number
}

export type ClaimMap = Array<{ tokenAddress: Address; amount: string }>

export type RewardModule = {
    getClaims: (p: { account: Address; provider: any }) => Promise<ClaimMap>
    getTimer?: (p: { provider: any }) => Promise<{ endTime: number; paused: boolean }>
    claimTx?: (p: { signer: any }) => Promise<any>
    tokensMeta?: RewardTokenMeta[]
    Panel?: React.ComponentType<{ config: StakingConfig; account?: Address }>
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
    subgraph: {
        poolKey: string
        userEntity: 'stakingUser'
        statsEntity: 'stakingStatistic'
        idForUser: (addr: string) => string
        idForStats: () => string
    }
    rewards: RewardModule
}



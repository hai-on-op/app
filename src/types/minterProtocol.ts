/**
 * Minter Protocol Types
 *
 * Defines the configuration and types for minter protocols like haiVELO (Optimism)
 * and haiAERO (Base). These protocols share a similar flow: users convert base tokens
 * (VELO, AERO) or their vote-escrowed NFTs into wrapped tokens (haiVELO, haiAERO).
 */

/** Supported minter protocol identifiers */
export type MinterProtocolId = 'haiVelo' | 'haiAero'

/** Chain IDs for supported networks */
export enum MinterChainId {
    OPTIMISM = 10,
    OPTIMISM_SEPOLIA = 11155420,
    BASE = 8453,
    BASE_SEPOLIA = 84532,
}

/**
 * Configuration for a minter protocol.
 * Each protocol has its own set of addresses, chain, and branding.
 */
export interface MinterProtocolConfig {
    /** Unique identifier for the protocol */
    id: MinterProtocolId

    /** Chain ID where the protocol is deployed */
    chainId: number

    /** Human-readable display name (e.g., "haiVELO", "haiAERO") */
    displayName: string

    /** Route path for the protocol page (e.g., "/haiVELO", "/haiAERO") */
    routePath: string

    /** Short description of the protocol */
    description: string

    /**
     * Token configuration
     */
    tokens: {
        /** Base token symbol (e.g., "VELO", "AERO") */
        baseTokenSymbol: string

        /** Base token address (e.g., VELO token on Optimism) */
        baseTokenAddress: `0x${string}`

        /** Vote-escrowed NFT contract address (e.g., veVELO, veAERO) */
        veNftAddress: `0x${string}`

        /** V1 wrapped token symbol (e.g., "HAIVELO") - optional, for migration */
        wrappedTokenV1Symbol?: string

        /** V1 wrapped token address - optional, for migration */
        wrappedTokenV1Address?: `0x${string}`

        /** V2 wrapped token symbol (e.g., "HAIVELOV2", "HAIAERO") */
        wrappedTokenV2Symbol: string

        /** V2 wrapped token address */
        wrappedTokenV2Address: `0x${string}`
    }

    /**
     * Collateral type IDs used in the GEB system
     */
    collateral: {
        /** V1 collateral type ID (e.g., "HAIVELO") - optional */
        v1Id?: string

        /** V2 collateral type ID (e.g., "HAIVELOV2", "HAIAERO") */
        v2Id: string
    }

    /**
     * Reward distribution infrastructure
     */
    rewards: {
        /** Depositer contract address for V1 - optional */
        depositerV1?: `0x${string}`

        /** Reward distributor address for V1 - optional */
        distributorV1?: `0x${string}`

        /** Depositer contract address for V2 - optional */
        depositerV2?: `0x${string}`

        /** Reward distributor address for V2 - optional */
        distributorV2?: `0x${string}`
    }

    /**
     * Data source configuration
     */
    dataSources: {
        /** RPC URL for the chain */
        rpcUrl: string

        /** Subgraph URL for querying protocol data */
        subgraphUrl: string

        /** LP subgraph URL - optional */
        lpSubgraphUrl?: string
    }

    /**
     * Feature flags for the protocol
     */
    features: {
        /** Whether V1 to V2 migration is supported */
        supportsV1Migration: boolean

        /** Whether veNFT deposits are supported */
        supportsVeNftDeposit: boolean

        /** Whether boost rewards are supported */
        supportsBoost: boolean
    }
}

/**
 * User account data for a minter protocol
 */
export interface MinterAccountData {
    /** V1 wrapped token balance (formatted) */
    v1Balance: string

    /** V2 wrapped token balance */
    v2Balance: {
        raw: string
        formatted: string
        decimals: number
    }

    /** Base token balance (e.g., VELO, AERO) */
    baseTokenBalance: {
        raw: string
        formatted: string
        decimals: number
    }

    /** Vote-escrowed NFT data */
    veNft: {
        totalRaw: string
        totalFormatted: string
        nfts: VeNftInfo[]
    }

    /** Loading state */
    isLoading: boolean

    /** Error state */
    isError: boolean

    /** Error details */
    error: unknown
}

/**
 * Vote-escrowed NFT information
 */
export interface VeNftInfo {
    tokenId: string
    balance: string
    balanceFormatted: string
    lockEndTime?: string
    lockEndDate?: string
}

/**
 * Protocol-level statistics
 */
export interface MinterProtocolStats {
    v1: MinterVersionStats
    v2: MinterVersionStats
    combined: {
        totalDeposited: string
        tvlUsd: number
    }
    isLoading: boolean
    isError: boolean
    error: unknown
}

/**
 * Statistics for a specific version (v1 or v2)
 */
export interface MinterVersionStats {
    totalDeposited: string
    tvlUsd: number
}

/**
 * Boost APR data for a minter protocol
 */
export interface MinterBoostAprData {
    dailyRewardValue: number
    totalBoostedValueParticipating: number
    baseAPR: number
    myBoost: number
    myValueParticipating: number
    myBoostedValueParticipating: number
    myBoostedShare: number
    myBoostedAPR: number
}

/**
 * Selected token type for minting
 */
export type MinterSelectedToken = 'BASE' | 'VE_NFT' | 'V1'

/**
 * Minting state managed by the provider
 */
export interface MinterMintingState {
    selectedToken: MinterSelectedToken
    convertAmountBase: string
    convertAmountV1: string
    selectedVeNftTokenIds: string[]
    simulatedAmount: number
    simulatedDepositAmount: number
}

/**
 * Context value for the minter protocol provider
 */
export interface MinterProtocolContextValue {
    /** Protocol configuration */
    config: MinterProtocolConfig

    /** Minting state */
    mintingState: MinterMintingState

    /** State setters */
    setSelectedToken: (token: MinterSelectedToken) => void
    setConvertAmountBase: (value: string) => void
    setConvertAmountV1: (value: string) => void
    setSelectedVeNftTokenIds: (ids: string[]) => void
    clearAll: () => void

    /** Account data */
    accountData: MinterAccountData

    /** Refetch account data */
    refetchAccount: () => Promise<void>
}

// Centralized haiVELO (v1/v2) definitions and helpers

export type HaiVeloVersion = 'v1' | 'v2'

// Token and contract addresses used across the app
// Note: Keep these as a single source of truth
export const VELO_TOKEN_ADDRESS: `0x${string}` = '0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db'
export const VE_NFT_CONTRACT_ADDRESS: `0x${string}` = '0xFAf8FD17D9840595845582fCB047DF13f006787d'
export const HAI_VELO_V2_TOKEN_ADDRESS: `0x${string}` = '0xc00843e6e7574b2a633206f78fe95941c98652ab'

// Reward distribution infra (currently v1 references)
export const HAIVELO_V1_DEPOSITER_ADDRESS: `0x${string}` = '0x7F4735237c41F7F8578A9C7d10A11e3BCFa3D4A3'
export const HAI_REWARD_DISTRIBUTOR_ADDRESS: `0x${string}` = '0xfEd2eB6325432F0bF7110DcE2CCC5fF811ac3D4D'

export type HaiVeloAddresses = {
    v1: {
        tokenSymbol: 'HAIVELO'
    }
    v2: {
        tokenAddress: `0x${string}`
    }
    reward: {
        depositerV1: `0x${string}`
        distributorV1: `0x${string}`
        // Future-proof placeholders for v2 if/when they differ
        depositerV2?: `0x${string}`
        distributorV2?: `0x${string}`
    }
    other: {
        veloToken: `0x${string}`
        veNft: `0x${string}`
    }
}

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

// Helpers
export function isHaiVeloCollateralId(id: string): boolean {
    const upper = id.toUpperCase()
    return upper === 'HAIVELO' || upper === 'HAIVELO_V2'
}

export function getHaiVeloCollateralIds(): string[] {
    // Extend when subgraph exposes v2 collateral id
    return ['HAIVELO']
}

export type HaiVeloBalances = {
    v1: { raw: string; formatted: string }
    v2: { raw: string; formatted: string }
    totalFormatted: string
}

// Placeholder types for future phases
export type HaiVeloTotals = {
    v1TvlUsd: number
    v2TvlUsd: number
    totalTvlUsd: number
    v1TotalDeposited: number
    v2TotalDeposited: number
}

export type HaiVeloBoost = {
    myBoost: number
    myShare: number
    totalBoostedValueUsd: number
}

export type HaiVeloAPR = {
    baseApr: number
    boostedApr: number
    breakdown: Array<{ source: string; apr: number; description?: string }>
}



export type HaiVeloVersion = 'v1' | 'v2'

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
        depositerV2?: `0x${string}`
        distributorV2?: `0x${string}`
    }
    other: {
        veloToken: `0x${string}`
        veNft: `0x${string}`
    }
}

export type HaiVeloBalances = {
    v1: { raw: string; formatted: string }
    v2: { raw: string; formatted: string }
    totalFormatted: string
}

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



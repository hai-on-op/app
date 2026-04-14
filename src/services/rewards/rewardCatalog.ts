import { REWARDS as STATIC_REWARDS } from '~/utils/rewards'

export interface VaultReward {
    [token: string]: number
}

export interface PoolReward {
    [token: string]: number
}

export function getVaultRewards(vaultId: string): VaultReward {
    return STATIC_REWARDS.vaults[vaultId as keyof typeof STATIC_REWARDS.vaults] || STATIC_REWARDS.default
}

export function getPoolRewards(poolAddress: string): PoolReward {
    return (
        STATIC_REWARDS.velodrome[poolAddress.toLowerCase() as keyof typeof STATIC_REWARDS.velodrome] ||
        STATIC_REWARDS.default
    )
}

export function getUniswapRewards(poolAddress: string): PoolReward {
    return (
        STATIC_REWARDS.uniswap[poolAddress.toLowerCase() as keyof typeof STATIC_REWARDS.uniswap] ||
        STATIC_REWARDS.default
    )
}

export function getAllVaultsWithRewards(): string[] {
    return Object.keys(STATIC_REWARDS.vaults).filter((vault) =>
        Object.values(STATIC_REWARDS.vaults[vault as keyof typeof STATIC_REWARDS.vaults] || {}).some(
            (amount) => amount !== 0
        )
    )
}

import StakingManagerABI from '~/abis/StakingManager.json'
import RewardPoolABI from '~/abis/RewardPool.json'

type Address = `0x${string}`

function requireEnv(name: string): string {
    const env = import.meta.env as unknown as Record<string, string | undefined>
    const value = env[name]
    if (!value || typeof value !== 'string' || !value.startsWith('0x') || value.length < 42) {
        throw new Error(`Missing or invalid env var ${name}`)
    }
    return value
}

export const contracts = Object.freeze({
    stakingManager: {
        address: requireEnv('VITE_STAKING_MANAGER') as Address,
        abi: StakingManagerABI,
    },
    rewardDistributor: {
        address: requireEnv('VITE_REWARD_DISTRIBUTOR_ADDRESS') as Address,
        // ABI intentionally provided by incentives service until moved here
        abi: undefined as unknown as Record<string, unknown>,
    },
    tokens: {
        kite: requireEnv('VITE_KITE_ADDRESS') as Address,
        stKite: requireEnv('VITE_STAKING_TOKEN_ADDRESS') as Address,
        hai: requireEnv('VITE_HAI_ADDRESS') as Address,
        op: requireEnv('VITE_OP_ADDRESS') as Address,
    },
    abis: {
        stakingManager: StakingManagerABI,
        rewardPool: RewardPoolABI,
    },
    decimals: Object.freeze({
        KITE: 18 as const,
        ST_KITE: 18 as const,
        HAI: 18 as const,
        OP: 18 as const,
    }),
})

export type ContractsConfig = typeof contracts



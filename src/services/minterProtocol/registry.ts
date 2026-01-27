/**
 * Minter Protocol Registry
 *
 * Central registry for all minter protocol configurations.
 * This is the single source of truth for addresses, chain IDs, and protocol settings.
 */

import type { MinterProtocolConfig, MinterProtocolId } from '~/types/minterProtocol'
import { MinterChainId } from '~/types/minterProtocol'
import { VITE_MAINNET_PUBLIC_RPC, VITE_PUBLIC_BASE_RPC, VITE_TESTNET_PUBLIC_RPC } from '~/utils'

// ============================================================================
// haiVELO Configuration (Optimism)
// ============================================================================

const HAI_VELO_CONFIG: MinterProtocolConfig = {
    id: 'haiVelo',
    chainId: MinterChainId.OPTIMISM,
    displayName: 'haiVELO',
    routePath: '/haiVELO',
    description: 'Convert VELO, veVELO, or haiVELO v1 to haiVELO v2',

    tokens: {
        baseTokenSymbol: 'VELO',
        baseTokenAddress: '0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db',
        veNftAddress: '0xFAf8FD17D9840595845582fCB047DF13f006787d',
        wrappedTokenV1Symbol: 'HAIVELO',
        wrappedTokenV1Address: undefined, // Retrieved from token store
        wrappedTokenV2Symbol: 'HAIVELOV2',
        wrappedTokenV2Address: '0x20A7EaF4a922DF50b312ef61AeA8B6E1deb5DdD6',
    },

    collateral: {
        v1Id: 'HAIVELO',
        v2Id: 'HAIVELOV2',
    },

    rewards: {
        depositerV1: '0x7F4735237c41F7F8578A9C7d10A11e3BCFa3D4A3',
        distributorV1: '0xfEd2eB6325432F0bF7110DcE2CCC5fF811ac3D4D',
        depositerV2: undefined,
        distributorV2: undefined,
    },

    dataSources: {
        rpcUrl: VITE_MAINNET_PUBLIC_RPC || 'https://mainnet.optimism.io',
        subgraphUrl:
            'https://api.goldsky.com/api/public/project_cmh0kaidl00khw2p29dmebtp5/subgraphs/hai-mainnet-v2/v1.0.9/gn',
        lpSubgraphUrl: undefined,
    },

    features: {
        supportsV1Migration: true,
        supportsVeNftDeposit: true,
        supportsBoost: true,
    },
}

// ============================================================================
// haiAERO Configuration (Base)
// ============================================================================

const HAI_AERO_CONFIG: MinterProtocolConfig = {
    id: 'haiAero',
    chainId: MinterChainId.BASE,
    displayName: 'haiAERO',
    routePath: '/haiAERO',
    description: 'Convert AERO or veAERO to haiAERO, then bridge to Optimism',

    tokens: {
        baseTokenSymbol: 'AERO',
        // Aerodrome AERO token on Base
        baseTokenAddress: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
        // veAERO NFT contract on Base
        veNftAddress: '0xeBf418Fe2512e7E6bd9b87a8F0f294aCDC67e6B4',
        wrappedTokenV1Symbol: undefined,
        wrappedTokenV1Address: undefined,
        wrappedTokenV2Symbol: 'HAIAERO',
        // haiAERO Token on Base (primary)
        wrappedTokenV2Address: '0x10398AbC267496E49106B07dd6BE13364D10dC71',
    },

    collateral: {
        v1Id: undefined,
        v2Id: 'HAIAERO',
    },

    rewards: {
        // haiAERO Prod multisig (receives deposited AERO)
        depositerV1: '0x7F4735237c41F7F8578A9C7d10A11e3BCFa3D4A3',
        distributorV1: undefined,
        depositerV2: undefined,
        distributorV2: undefined,
    },

    dataSources: {
        // Base mainnet RPC
        rpcUrl: VITE_PUBLIC_BASE_RPC || 'https://mainnet.base.org',
        // Placeholder - to be updated with actual subgraph
        subgraphUrl: '',
        lpSubgraphUrl: undefined,
    },

    features: {
        supportsV1Migration: false,
        supportsVeNftDeposit: true,
        supportsBoost: true,
    },
}

// ============================================================================
// haiAERO Bridge Configuration (Base <-> Optimism via Hyperlane)
// ============================================================================

export const HAI_AERO_BRIDGE_CONFIG = {
    // Source chain (Base)
    sourceChain: {
        chainId: MinterChainId.BASE,
        name: 'Base',
        // haiAERO token on Base
        tokenAddress: '0x10398AbC267496E49106B07dd6BE13364D10dC71' as `0x${string}`,
        // HypERC20Collateral contract (locks haiAERO on Base)
        hypCollateralAddress: '0xd605046d24cdad37ca2dff3aa8ebf254ceee86d5' as `0x${string}`,
        // Interchain Gas Paymaster (IGP) on Base
        igpAddress: '0xc3F23848Ed2e04C0c6d41bd7804fa8f89F940B94' as `0x${string}`,
        rpcUrl: VITE_PUBLIC_BASE_RPC || 'https://mainnet.base.org',
    },
    // Destination chain (Optimism)
    destinationChain: {
        chainId: MinterChainId.OPTIMISM,
        name: 'Optimism',
        // Bridged haiAERO token on Optimism (HypERC20 synthetic)
        tokenAddress: '0xbdF4A4Cc124d9A83a5774574fcBE45DC5d1f1152' as `0x${string}`,
        // HypERC20 synthetic contract
        hypSyntheticAddress: '0xbdF4A4Cc124d9A83a5774574fcBE45DC5d1f1152' as `0x${string}`,
        rpcUrl: VITE_MAINNET_PUBLIC_RPC || 'https://mainnet.optimism.io',
    },
    // Hyperlane domain IDs
    domains: {
        base: 8453,
        optimism: 10,
    },
    // Estimated bridge time in seconds
    estimatedBridgeTimeSeconds: 40,
}

// ============================================================================
// Testnet Configurations
// ============================================================================

const HAI_VELO_SEPOLIA_CONFIG: MinterProtocolConfig = {
    ...HAI_VELO_CONFIG,
    chainId: MinterChainId.OPTIMISM_SEPOLIA,
    dataSources: {
        rpcUrl: VITE_TESTNET_PUBLIC_RPC || 'https://sepolia.optimism.io',
        subgraphUrl:
            'https://subgraph.satsuma-prod.com/ea4569e42b10/duuvf2ayrz8e0yxg0udnic--151680/hai-sepolia-redeploy/api',
        lpSubgraphUrl: undefined,
    },
}

const HAI_AERO_SEPOLIA_CONFIG: MinterProtocolConfig = {
    ...HAI_AERO_CONFIG,
    chainId: MinterChainId.BASE_SEPOLIA,
    dataSources: {
        rpcUrl: 'https://sepolia.base.org',
        subgraphUrl: '',
        lpSubgraphUrl: undefined,
    },
}

// ============================================================================
// Protocol Registry
// ============================================================================

/**
 * Registry of all minter protocol configurations by protocol ID
 */
export const MINTER_PROTOCOLS: Record<MinterProtocolId, MinterProtocolConfig> = {
    haiVelo: HAI_VELO_CONFIG,
    haiAero: HAI_AERO_CONFIG,
}

/**
 * Registry of testnet configurations
 */
export const MINTER_PROTOCOLS_TESTNET: Record<MinterProtocolId, MinterProtocolConfig> = {
    haiVelo: HAI_VELO_SEPOLIA_CONFIG,
    haiAero: HAI_AERO_SEPOLIA_CONFIG,
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get protocol configuration by ID
 */
export function getProtocolConfig(id: MinterProtocolId, useTestnet = false): MinterProtocolConfig {
    const registry = useTestnet ? MINTER_PROTOCOLS_TESTNET : MINTER_PROTOCOLS
    const config = registry[id]
    if (!config) {
        throw new Error(`Unknown minter protocol: ${id}`)
    }
    return config
}

/**
 * Get protocol configuration by chain ID
 */
export function getProtocolByChain(chainId: number): MinterProtocolConfig | undefined {
    // Check mainnet configs first
    for (const config of Object.values(MINTER_PROTOCOLS)) {
        if (config.chainId === chainId) {
            return config
        }
    }
    // Check testnet configs
    for (const config of Object.values(MINTER_PROTOCOLS_TESTNET)) {
        if (config.chainId === chainId) {
            return config
        }
    }
    return undefined
}

/**
 * Get protocol configuration by collateral type ID
 */
export function getProtocolByCollateral(collateralId: string): MinterProtocolConfig | undefined {
    const upperCollateral = collateralId.toUpperCase()

    for (const config of Object.values(MINTER_PROTOCOLS)) {
        if (config.collateral.v1Id?.toUpperCase() === upperCollateral) {
            return config
        }
        if (config.collateral.v2Id.toUpperCase() === upperCollateral) {
            return config
        }
    }

    for (const config of Object.values(MINTER_PROTOCOLS_TESTNET)) {
        if (config.collateral.v1Id?.toUpperCase() === upperCollateral) {
            return config
        }
        if (config.collateral.v2Id.toUpperCase() === upperCollateral) {
            return config
        }
    }

    return undefined
}

/**
 * Check if a collateral ID belongs to a minter protocol
 */
export function isMinterCollateral(collateralId: string): boolean {
    return getProtocolByCollateral(collateralId) !== undefined
}

/**
 * Get all protocol IDs
 */
export function getAllProtocolIds(): MinterProtocolId[] {
    return Object.keys(MINTER_PROTOCOLS) as MinterProtocolId[]
}

/**
 * Get all collateral IDs for minter protocols
 */
export function getAllMinterCollateralIds(): string[] {
    const ids: string[] = []

    for (const config of Object.values(MINTER_PROTOCOLS)) {
        if (config.collateral.v1Id) {
            ids.push(config.collateral.v1Id)
        }
        ids.push(config.collateral.v2Id)
    }

    return ids
}

// ============================================================================
// Re-export addresses for backward compatibility with haiVeloService
// ============================================================================

export const VELO_TOKEN_ADDRESS = HAI_VELO_CONFIG.tokens.baseTokenAddress
export const VE_NFT_CONTRACT_ADDRESS = HAI_VELO_CONFIG.tokens.veNftAddress
export const HAI_VELO_V2_TOKEN_ADDRESS = HAI_VELO_CONFIG.tokens.wrappedTokenV2Address
export const HAIVELO_V1_DEPOSITER_ADDRESS = HAI_VELO_CONFIG.rewards.depositerV1!
export const HAI_REWARD_DISTRIBUTOR_ADDRESS = HAI_VELO_CONFIG.rewards.distributorV1!

// Base/Aerodrome addresses
export const AERO_TOKEN_ADDRESS = HAI_AERO_CONFIG.tokens.baseTokenAddress
export const VE_AERO_CONTRACT_ADDRESS = HAI_AERO_CONFIG.tokens.veNftAddress
export const HAI_AERO_TOKEN_ADDRESS = HAI_AERO_CONFIG.tokens.wrappedTokenV2Address
export const HAI_AERO_DEPOSITER_ADDRESS = HAI_AERO_CONFIG.rewards.depositerV1!

// Bridge addresses (Hyperlane)
export const HAI_AERO_HYP_COLLATERAL_ADDRESS = HAI_AERO_BRIDGE_CONFIG.sourceChain.hypCollateralAddress
export const HAI_AERO_BRIDGED_TOKEN_ADDRESS = HAI_AERO_BRIDGE_CONFIG.destinationChain.tokenAddress


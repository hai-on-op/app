/**
 * Bridge Types
 *
 * Types for Hyperlane cross-chain bridge operations.
 * Used for bridging haiAERO between Base and Optimism.
 */

import { MinterChainId } from './minterProtocol'

/**
 * Bridge direction
 */
export type BridgeDirection = 'base-to-optimism' | 'optimism-to-base'

/**
 * Hyperlane bridge configuration for a source chain
 */
export interface BridgeSourceChainConfig {
    /** Chain ID */
    chainId: MinterChainId
    /** Human-readable chain name */
    name: string
    /** Token address on source chain */
    tokenAddress: `0x${string}`
    /** HypERC20Collateral contract address */
    hypCollateralAddress: `0x${string}`
    /** Interchain Gas Paymaster contract address */
    igpAddress: `0x${string}`
    /** RPC URL for the chain */
    rpcUrl: string
}

/**
 * Hyperlane bridge configuration for a destination chain
 */
export interface BridgeDestinationChainConfig {
    /** Chain ID */
    chainId: MinterChainId
    /** Human-readable chain name */
    name: string
    /** Bridged token address on destination chain */
    tokenAddress: `0x${string}`
    /** HypERC20 synthetic contract address */
    hypSyntheticAddress: `0x${string}`
    /** RPC URL for the chain */
    rpcUrl: string
}

/**
 * Complete bridge configuration
 */
export interface BridgeConfig {
    /** Source chain config */
    sourceChain: BridgeSourceChainConfig
    /** Destination chain config */
    destinationChain: BridgeDestinationChainConfig
    /** Hyperlane domain IDs */
    domains: {
        [key: string]: number
    }
    /** Estimated bridge time in minutes */
    estimatedBridgeTimeMinutes: number
}

/**
 * Bridge transaction status
 */
export type BridgeTransactionStatus =
    | 'idle'
    | 'approving'
    | 'approved'
    | 'bridging'
    | 'pending_confirmation'
    | 'confirmed'
    | 'delivered'
    | 'failed'

/**
 * Bridge transaction tracking data
 */
export interface BridgeTransaction {
    /** Unique transaction ID */
    id: string
    /** Source chain transaction hash */
    sourceTxHash?: `0x${string}`
    /** Destination chain transaction hash (once delivered) */
    destinationTxHash?: `0x${string}`
    /** Amount being bridged (formatted) */
    amount: string
    /** Current status */
    status: BridgeTransactionStatus
    /** Timestamp when bridge was initiated */
    initiatedAt: number
    /** Estimated delivery time */
    estimatedDeliveryAt: number
    /** Source chain ID */
    sourceChainId: number
    /** Destination chain ID */
    destinationChainId: number
    /** Error message if failed */
    error?: string
}

/**
 * Bridge fee quote
 */
export interface BridgeQuote {
    /** Fee amount in native token (ETH) */
    feeWei: string
    /** Fee amount formatted */
    feeFormatted: string
    /** Fee in USD */
    feeUsd?: number
    /** Estimated gas for the bridge transaction */
    estimatedGas: string
    /** Is the quote loading */
    isLoading: boolean
    /** Quote error */
    error?: string
}

/**
 * Bridge approval state
 */
export interface BridgeApprovalState {
    /** Current allowance */
    allowance: string
    /** Whether approval is needed */
    needsApproval: boolean
    /** Is the approval check loading */
    isLoading: boolean
}

/**
 * Parameters for initiating a bridge transfer
 */
export interface BridgeTransferParams {
    /** Amount to bridge (in wei) */
    amount: string
    /** Recipient address on destination chain */
    recipient: `0x${string}`
}

/**
 * Return type for the useMinterBridge hook
 */
export interface UseMinterBridgeReturn {
    /** Bridge configuration */
    config: BridgeConfig
    /** Current fee quote */
    quote: BridgeQuote
    /** Approval state */
    approval: BridgeApprovalState
    /** Active bridge transaction (if any) */
    activeTransaction?: BridgeTransaction
    /** Past bridge transactions */
    transactionHistory: BridgeTransaction[]
    /** Approve tokens for bridging */
    approve: (amount: string) => Promise<`0x${string}` | undefined>
    /** Execute bridge transfer */
    bridge: (params: BridgeTransferParams) => Promise<`0x${string}` | undefined>
    /** Refresh quote */
    refreshQuote: (amount: string) => Promise<void>
    /** Check transaction status */
    checkStatus: (txHash: `0x${string}`) => Promise<BridgeTransactionStatus>
    /** Validation error message (if any) */
    validationError?: string
    /** Whether validation is in progress */
    isValidating: boolean
    /** Loading states */
    isApproving: boolean
    isBridging: boolean
}

/**
 * Multi-step transaction state for mint + bridge flow
 */
export type MintBridgeStep =
    | 'idle'
    | 'approve_mint'
    | 'minting'
    | 'minted'
    | 'approve_bridge'
    | 'bridging'
    | 'pending_delivery'
    | 'completed'
    | 'failed'

/**
 * Multi-step transaction context
 */
export interface MintBridgeTransactionState {
    /** Current step */
    currentStep: MintBridgeStep
    /** Whether to include bridge after mint */
    includeBridge: boolean
    /** Amount being minted */
    mintAmount: string
    /** Amount being bridged (usually same as mint amount) */
    bridgeAmount: string
    /** Mint transaction hash */
    mintTxHash?: `0x${string}`
    /** Bridge transaction data */
    bridgeTransaction?: BridgeTransaction
    /** Error message if any step failed */
    error?: string
}


/**
 * Hyperlane Bridge Service
 *
 * Service for bridging haiAERO between Base and Optimism via Hyperlane.
 * Supports both directions: Base → Optimism and Optimism → Base.
 */

import { ethers, BigNumber } from 'ethers'
import type {
    BridgeConfig,
    BridgeQuote,
    BridgeApprovalState,
    BridgeTransactionStatus,
    BridgeDirection,
} from '~/types/bridge'
import { HAI_AERO_BRIDGE_CONFIG } from '~/services/minterProtocol/registry'
import { HYP_ERC20_COLLATERAL_ABI, HYP_ERC20_SYNTHETIC_ABI, ERC20_APPROVAL_ABI } from './abi'

function getBridgeErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message
    }

    const anyError = error as {
        reason?: string
        data?: { message?: string }
        error?: { message?: string }
        message?: string
    }

    return (
        anyError?.reason ||
        anyError?.data?.message ||
        anyError?.error?.message ||
        anyError?.message ||
        'Bridge transaction failed.'
    )
}

/**
 * Convert an Ethereum address to bytes32 format (padded)
 * Required by Hyperlane for recipient addresses
 */
export function addressToBytes32(address: string): string {
    return ethers.utils.hexZeroPad(address, 32)
}

/**
 * Convert bytes32 back to an Ethereum address
 */
export function bytes32ToAddress(bytes32: string): string {
    return ethers.utils.getAddress('0x' + bytes32.slice(-40))
}

/**
 * Get the bridge configuration
 */
export function getBridgeConfig(): BridgeConfig {
    return HAI_AERO_BRIDGE_CONFIG
}

// Provider cache for connection reuse
let cachedBaseProvider: ethers.providers.JsonRpcProvider | null = null
let cachedOptimismProvider: ethers.providers.JsonRpcProvider | null = null

/**
 * Get a provider for Base chain (cached for performance)
 */
export function getBaseProvider(): ethers.providers.JsonRpcProvider {
    if (!cachedBaseProvider) {
        cachedBaseProvider = new ethers.providers.JsonRpcProvider(HAI_AERO_BRIDGE_CONFIG.sourceChain.rpcUrl)
    }
    return cachedBaseProvider
}

/**
 * Get a provider for Optimism chain (cached for performance)
 */
export function getOptimismProvider(): ethers.providers.JsonRpcProvider {
    if (!cachedOptimismProvider) {
        cachedOptimismProvider = new ethers.providers.JsonRpcProvider(HAI_AERO_BRIDGE_CONFIG.destinationChain.rpcUrl)
    }
    return cachedOptimismProvider
}

// Legacy aliases for backward compatibility
export const getSourceProvider = getBaseProvider
export const getDestinationProvider = getOptimismProvider

/**
 * Get the provider for a specific direction's source chain
 */
export function getProviderForDirection(
    direction: BridgeDirection,
    which: 'source' | 'destination'
): ethers.providers.JsonRpcProvider {
    if (direction === 'base-to-optimism') {
        return which === 'source' ? getBaseProvider() : getOptimismProvider()
    } else {
        return which === 'source' ? getOptimismProvider() : getBaseProvider()
    }
}

/**
 * Get the HypERC20Collateral contract instance (Base)
 */
export function getHypCollateralContract(signerOrProvider: ethers.Signer | ethers.providers.Provider) {
    return new ethers.Contract(
        HAI_AERO_BRIDGE_CONFIG.sourceChain.hypCollateralAddress,
        HYP_ERC20_COLLATERAL_ABI,
        signerOrProvider
    )
}

/**
 * Get the HypERC20Synthetic contract instance (Optimism)
 */
export function getHypSyntheticContract(signerOrProvider: ethers.Signer | ethers.providers.Provider) {
    return new ethers.Contract(
        HAI_AERO_BRIDGE_CONFIG.destinationChain.hypSyntheticAddress,
        HYP_ERC20_SYNTHETIC_ABI,
        signerOrProvider
    )
}

/**
 * Get the router contract for a given direction
 * Base → Optimism: uses HypCollateral on Base
 * Optimism → Base: uses HypSynthetic on Optimism
 */
export function getRouterContract(
    signerOrProvider: ethers.Signer | ethers.providers.Provider,
    direction: BridgeDirection
) {
    if (direction === 'base-to-optimism') {
        return getHypCollateralContract(signerOrProvider)
    } else {
        return getHypSyntheticContract(signerOrProvider)
    }
}

/**
 * Get the haiAERO token contract on Base
 */
export function getBaseTokenContract(signerOrProvider: ethers.Signer | ethers.providers.Provider) {
    return new ethers.Contract(
        HAI_AERO_BRIDGE_CONFIG.sourceChain.tokenAddress,
        ERC20_APPROVAL_ABI,
        signerOrProvider
    )
}

/**
 * Get the haiAERO token contract on Optimism (synthetic)
 */
export function getOptimismTokenContract(signerOrProvider: ethers.Signer | ethers.providers.Provider) {
    return new ethers.Contract(
        HAI_AERO_BRIDGE_CONFIG.destinationChain.tokenAddress,
        HYP_ERC20_SYNTHETIC_ABI,
        signerOrProvider
    )
}

// Legacy alias
export const getSourceTokenContract = getBaseTokenContract

/**
 * Get the token contract for a direction's source chain
 */
export function getTokenContractForDirection(
    signerOrProvider: ethers.Signer | ethers.providers.Provider,
    direction: BridgeDirection
) {
    if (direction === 'base-to-optimism') {
        return getBaseTokenContract(signerOrProvider)
    } else {
        return getOptimismTokenContract(signerOrProvider)
    }
}

/**
 * Get the spender address (router) for a direction
 */
export function getSpenderForDirection(direction: BridgeDirection): `0x${string}` {
    if (direction === 'base-to-optimism') {
        return HAI_AERO_BRIDGE_CONFIG.sourceChain.hypCollateralAddress
    } else {
        // For Optimism → Base, the synthetic token IS the router, no separate approval needed
        // But we return the synthetic address for consistency
        return HAI_AERO_BRIDGE_CONFIG.destinationChain.hypSyntheticAddress
    }
}

/**
 * Get destination domain for a direction
 */
export function getDestinationDomain(direction: BridgeDirection): number {
    if (direction === 'base-to-optimism') {
        return HAI_AERO_BRIDGE_CONFIG.domains.optimism
    } else {
        return HAI_AERO_BRIDGE_CONFIG.domains.base
    }
}

/**
 * Quote the gas payment for a bridge transfer.
 * Calls quoteGasPayment on the appropriate warp route contract.
 */
export async function quoteBridgeFee(
    amount: string,
    direction: BridgeDirection = 'base-to-optimism'
): Promise<BridgeQuote> {
    try {
        const provider = getProviderForDirection(direction, 'source')
        const router = getRouterContract(provider, direction)
        const destinationDomain = getDestinationDomain(direction)

        // Quote gas payment from the warp route's configured hook
        const feeWei: BigNumber = await router.quoteGasPayment(destinationDomain)

        return {
            feeWei: feeWei.toString(),
            feeFormatted: ethers.utils.formatEther(feeWei),
            estimatedGas: '200000',
            isLoading: false,
        }
    } catch (error) {
        console.error('Error quoting bridge fee:', error)
        return {
            feeWei: '0',
            feeFormatted: '0',
            estimatedGas: '0',
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to quote bridge fee',
        }
    }
}

/**
 * Check the approval state for bridging
 */
export async function checkBridgeApproval(
    userAddress: string,
    amount: string,
    direction: BridgeDirection = 'base-to-optimism'
): Promise<BridgeApprovalState> {
    try {
        const provider = getProviderForDirection(direction, 'source')
        const tokenContract = getTokenContractForDirection(provider, direction)
        const spender = getSpenderForDirection(direction)

        const allowance: BigNumber = await tokenContract.allowance(userAddress, spender)
        const amountBN = BigNumber.from(amount)
        const needsApproval = allowance.lt(amountBN)

        return {
            allowance: allowance.toString(),
            needsApproval,
            isLoading: false,
        }
    } catch (error) {
        console.error('Error checking bridge approval:', error)
        return {
            allowance: '0',
            needsApproval: true,
            isLoading: false,
        }
    }
}

/**
 * Validate bridge prerequisites before executing a transfer.
 */
export async function validateBridgePrerequisites(
    userAddress: string,
    amount: string,
    direction: BridgeDirection = 'base-to-optimism',
    providerOverride?: ethers.providers.Provider
): Promise<{ valid: boolean; error?: string }> {
    if (!amount || amount === '0') {
        return { valid: false, error: 'Enter an amount to bridge.' }
    }

    let amountBN: BigNumber
    try {
        amountBN = BigNumber.from(amount)
    } catch {
        return { valid: false, error: 'Invalid bridge amount.' }
    }

    const sourceChainName = direction === 'base-to-optimism' ? 'Base' : 'Optimism'
    const provider = providerOverride || getProviderForDirection(direction, 'source')
    const spender = getSpenderForDirection(direction)
    const destinationDomain = getDestinationDomain(direction)

    // Verify router contract exists
    try {
        const contractCode = await provider.getCode(spender)
        if (!contractCode || contractCode === '0x') {
            return { valid: false, error: `Bridge contract not found on ${sourceChainName}.` }
        }
    } catch (error) {
        console.error('Error checking bridge contract code:', error)
        return { valid: false, error: `Unable to read bridge contract: ${getBridgeErrorMessage(error)}` }
    }

    const tokenContract = getTokenContractForDirection(provider, direction)
    const router = getRouterContract(provider, direction)
    let balance: BigNumber
    let allowance: BigNumber
    let feeWei: BigNumber
    let nativeBalance: BigNumber

    try {
        ;[balance, allowance, feeWei, nativeBalance] = await Promise.all([
            tokenContract.balanceOf(userAddress),
            tokenContract.allowance(userAddress, spender),
            router.quoteGasPayment(destinationDomain),
            provider.getBalance(userAddress),
        ])
    } catch (error) {
        console.error('Error fetching bridge prerequisites:', error)
        return { valid: false, error: `Unable to fetch bridge data: ${getBridgeErrorMessage(error)}` }
    }

    if (balance.lt(amountBN)) {
        return { valid: false, error: `Insufficient haiAERO balance on ${sourceChainName}.` }
    }

    if (allowance.lt(amountBN)) {
        return { valid: false, error: 'Approve haiAERO before bridging.' }
    }

    const feeWithBuffer = feeWei.mul(110).div(100)
    if (nativeBalance.lt(feeWithBuffer)) {
        return { valid: false, error: `Insufficient ETH on ${sourceChainName} to pay bridge fee.` }
    }

    return { valid: true }
}

/**
 * Approve haiAERO for bridging
 */
export async function approveBridge(
    signer: ethers.Signer,
    amount: string,
    direction: BridgeDirection = 'base-to-optimism'
): Promise<{ txHash: `0x${string}`; wait: () => Promise<ethers.ContractReceipt> }> {
    const tokenContract = getTokenContractForDirection(signer, direction)
    const spender = getSpenderForDirection(direction)

    const tx = await tokenContract.approve(spender, amount)

    return {
        txHash: tx.hash as `0x${string}`,
        wait: () => tx.wait(),
    }
}

/**
 * Execute a bridge transfer
 */
export async function executeBridge(
    signer: ethers.Signer,
    amount: string,
    recipient: string,
    direction: BridgeDirection = 'base-to-optimism'
): Promise<{
    txHash: `0x${string}`
    messageId?: string
    wait: () => Promise<ethers.ContractReceipt>
}> {
    const router = getRouterContract(signer, direction)
    const destinationDomain = getDestinationDomain(direction)

    // Convert recipient to bytes32
    const recipientBytes32 = addressToBytes32(recipient)

    // Quote gas payment from the warp route's configured hook
    const feeWei: BigNumber = await router.quoteGasPayment(destinationDomain)

    // Add 10% buffer to the fee for safety
    const feeWithBuffer = feeWei.mul(110).div(100)

    // Simulate first to get the messageId and catch errors
    let messageId: string | undefined
    try {
        messageId = await router.callStatic.transferRemote(destinationDomain, recipientBytes32, amount, {
            value: feeWithBuffer,
        })
    } catch (error) {
        throw new Error(getBridgeErrorMessage(error))
    }

    // Execute transfer
    const tx = await router.transferRemote(destinationDomain, recipientBytes32, amount, {
        value: feeWithBuffer,
    })

    return {
        txHash: tx.hash as `0x${string}`,
        messageId: messageId || undefined,
        wait: async () => {
            const receipt = await tx.wait()
            // Try to extract messageId from receipt logs if we don't have it yet
            if (!messageId) {
                messageId = parseMessageIdFromReceipt(receipt)
            }
            return receipt
        },
    }
}

/**
 * Parse the message ID from a bridge transaction receipt.
 * Looks for the DispatchId event emitted by the Hyperlane Mailbox contract.
 */
export function parseMessageIdFromReceipt(receipt: ethers.ContractReceipt): string | undefined {
    // Look for the DispatchId(bytes32 indexed messageId) event from the Hyperlane Mailbox
    const DISPATCH_ID_TOPIC = ethers.utils.id('DispatchId(bytes32)')

    for (const log of receipt.logs) {
        if (log.topics[0] === DISPATCH_ID_TOPIC && log.topics.length >= 2) {
            return log.topics[1] // The messageId is the first indexed param
        }
    }

    // Fallback: look for the Dispatch event
    const DISPATCH_TOPIC = ethers.utils.id('Dispatch(address,uint32,bytes32,bytes)')
    for (const log of receipt.logs) {
        if (log.topics[0] === DISPATCH_TOPIC) {
            // For the Dispatch event, messageId = keccak256(message)
            // The message bytes are in the data field
            try {
                const decoded = ethers.utils.defaultAbiCoder.decode(['bytes'], log.data)
                if (decoded[0]) {
                    return ethers.utils.keccak256(decoded[0])
                }
            } catch {
                // Continue to next log
            }
        }
    }

    return undefined
}

/**
 * Check if a bridge transaction has been delivered on the destination chain
 * This is a simplified check - in production you'd use the Hyperlane Explorer API
 */
export async function checkBridgeStatus(sourceTxHash: string): Promise<BridgeTransactionStatus> {
    try {
        // For now, we'll check if the source transaction was mined
        const provider = getSourceProvider()
        const receipt = await provider.getTransactionReceipt(sourceTxHash)

        if (!receipt) {
            return 'bridging'
        }

        if (receipt.status === 0) {
            return 'failed'
        }

        // Transaction was successful on source chain
        // In a real implementation, you'd query the Hyperlane Explorer API
        // to check if the message was delivered on the destination chain
        // For now, we assume pending confirmation after source tx success
        return 'pending_confirmation'
    } catch (error) {
        console.error('Error checking bridge status:', error)
        return 'bridging'
    }
}

/**
 * Get haiAERO balance on Base
 */
export async function getBaseBalance(userAddress: string): Promise<{
    raw: string
    formatted: string
    decimals: number
}> {
    // haiAERO uses 18 decimals on all chains
    const decimals = 18

    try {
        const provider = getBaseProvider()
        const tokenContract = getBaseTokenContract(provider)

        const balance: BigNumber = await tokenContract.balanceOf(userAddress)

        return {
            raw: balance.toString(),
            formatted: ethers.utils.formatUnits(balance, decimals),
            decimals,
        }
    } catch (error) {
        console.error('[Bridge] Error getting Base balance:', error)
        return {
            raw: '0',
            formatted: '0',
            decimals,
        }
    }
}

/**
 * Get haiAERO balance on Optimism
 */
export async function getOptimismBalance(userAddress: string): Promise<{
    raw: string
    formatted: string
    decimals: number
}> {
    const tokenAddress = HAI_AERO_BRIDGE_CONFIG.destinationChain.tokenAddress
    // haiAERO uses 18 decimals on all chains
    const decimals = 18

    try {
        const provider = getOptimismProvider()

        // Normalize the user address
        const normalizedAddress = ethers.utils.getAddress(userAddress)

        const tokenContract = new ethers.Contract(tokenAddress, ERC20_APPROVAL_ABI, provider)

        const balance: BigNumber = await tokenContract.balanceOf(normalizedAddress)

        return {
            raw: balance.toString(),
            formatted: ethers.utils.formatUnits(balance, decimals),
            decimals,
        }
    } catch (error) {
        console.error('[Bridge] Error getting Optimism balance:', error)
        return {
            raw: '0',
            formatted: '0',
            decimals,
        }
    }
}

// Legacy aliases for backward compatibility
export const getSourceBalance = getBaseBalance
export const getDestinationBalance = getOptimismBalance

/**
 * Get balances for both chains
 */
export async function getBothBalances(userAddress: string): Promise<{
    base: { raw: string; formatted: string; decimals: number }
    optimism: { raw: string; formatted: string; decimals: number }
}> {
    const [base, optimism] = await Promise.all([getBaseBalance(userAddress), getOptimismBalance(userAddress)])
    return { base, optimism }
}


/**
 * Hyperlane Bridge Service
 *
 * Service for bridging haiAERO from Base to Optimism via Hyperlane.
 */

import { ethers, BigNumber } from 'ethers'
import type { BridgeConfig, BridgeQuote, BridgeApprovalState, BridgeTransactionStatus } from '~/types/bridge'
import { HAI_AERO_BRIDGE_CONFIG } from '~/services/minterProtocol/registry'
import { HYP_ERC20_COLLATERAL_ABI, ERC20_APPROVAL_ABI } from './abi'

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

/**
 * Get a provider for the source chain (Base)
 */
export function getSourceProvider(): ethers.providers.JsonRpcProvider {
    return new ethers.providers.JsonRpcProvider(HAI_AERO_BRIDGE_CONFIG.sourceChain.rpcUrl)
}

/**
 * Get a provider for the destination chain (Optimism)
 */
export function getDestinationProvider(): ethers.providers.JsonRpcProvider {
    return new ethers.providers.JsonRpcProvider(HAI_AERO_BRIDGE_CONFIG.destinationChain.rpcUrl)
}

/**
 * Get the HypERC20Collateral contract instance
 */
export function getHypCollateralContract(signerOrProvider: ethers.Signer | ethers.providers.Provider) {
    return new ethers.Contract(
        HAI_AERO_BRIDGE_CONFIG.sourceChain.hypCollateralAddress,
        HYP_ERC20_COLLATERAL_ABI,
        signerOrProvider
    )
}

/**
 * Get the haiAERO token contract on Base
 */
export function getSourceTokenContract(signerOrProvider: ethers.Signer | ethers.providers.Provider) {
    return new ethers.Contract(
        HAI_AERO_BRIDGE_CONFIG.sourceChain.tokenAddress,
        ERC20_APPROVAL_ABI,
        signerOrProvider
    )
}

/**
 * Quote the gas payment for a bridge transfer
 */
export async function quoteBridgeFee(amount: string): Promise<BridgeQuote> {
    try {
        const provider = getSourceProvider()
        const hypCollateral = getHypCollateralContract(provider)

        // Get destination domain (Optimism)
        const destinationDomain = HAI_AERO_BRIDGE_CONFIG.domains.optimism

        // Quote gas payment
        const feeWei: BigNumber = await hypCollateral.quoteGasPayment(destinationDomain, amount)

        // Estimate gas for the bridge transaction
        const estimatedGas = BigNumber.from(200000) // Conservative estimate

        return {
            feeWei: feeWei.toString(),
            feeFormatted: ethers.utils.formatEther(feeWei),
            estimatedGas: estimatedGas.toString(),
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
export async function checkBridgeApproval(userAddress: string, amount: string): Promise<BridgeApprovalState> {
    try {
        const provider = getSourceProvider()
        const tokenContract = getSourceTokenContract(provider)

        const allowance: BigNumber = await tokenContract.allowance(
            userAddress,
            HAI_AERO_BRIDGE_CONFIG.sourceChain.hypCollateralAddress
        )

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
 * Approve haiAERO for bridging
 * Returns the transaction hash
 */
export async function approveBridge(
    signer: ethers.Signer,
    amount: string
): Promise<{ txHash: `0x${string}`; wait: () => Promise<ethers.ContractReceipt> }> {
    const tokenContract = getSourceTokenContract(signer)

    const tx = await tokenContract.approve(HAI_AERO_BRIDGE_CONFIG.sourceChain.hypCollateralAddress, amount)

    return {
        txHash: tx.hash as `0x${string}`,
        wait: () => tx.wait(),
    }
}

/**
 * Execute a bridge transfer
 * Returns the transaction hash and message ID
 */
export async function executeBridge(
    signer: ethers.Signer,
    amount: string,
    recipient: string
): Promise<{
    txHash: `0x${string}`
    messageId?: string
    wait: () => Promise<ethers.ContractReceipt>
}> {
    const hypCollateral = getHypCollateralContract(signer)
    const destinationDomain = HAI_AERO_BRIDGE_CONFIG.domains.optimism

    // Convert recipient to bytes32
    const recipientBytes32 = addressToBytes32(recipient)

    // Quote gas payment
    const feeWei: BigNumber = await hypCollateral.quoteGasPayment(destinationDomain, amount)

    // Add 10% buffer to the fee
    const feeWithBuffer = feeWei.mul(110).div(100)

    // Execute transfer
    const tx = await hypCollateral.transferRemote(destinationDomain, recipientBytes32, amount, {
        value: feeWithBuffer,
    })

    return {
        txHash: tx.hash as `0x${string}`,
        wait: async () => {
            const receipt = await tx.wait()
            return receipt
        },
    }
}

/**
 * Parse the message ID from a bridge transaction receipt
 */
export function parseMessageIdFromReceipt(receipt: ethers.ContractReceipt): string | undefined {
    // Look for the SentTransferRemote event
    const hypCollateralInterface = new ethers.utils.Interface(HYP_ERC20_COLLATERAL_ABI)

    for (const log of receipt.logs) {
        try {
            const parsed = hypCollateralInterface.parseLog(log)
            if (parsed.name === 'SentTransferRemote') {
                // The message ID is typically in the transaction's return value or logs
                // For now, we'll use the transaction hash as a proxy
                return receipt.transactionHash
            }
        } catch {
            // Log doesn't match this interface, continue
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
 * Get the haiAERO balance on the destination chain (Optimism)
 */
export async function getDestinationBalance(userAddress: string): Promise<{
    raw: string
    formatted: string
    decimals: number
}> {
    try {
        const provider = getDestinationProvider()
        const tokenContract = new ethers.Contract(
            HAI_AERO_BRIDGE_CONFIG.destinationChain.tokenAddress,
            ERC20_APPROVAL_ABI,
            provider
        )

        const [balance, decimals]: [BigNumber, number] = await Promise.all([
            tokenContract.balanceOf(userAddress),
            tokenContract.decimals(),
        ])

        return {
            raw: balance.toString(),
            formatted: ethers.utils.formatUnits(balance, decimals),
            decimals,
        }
    } catch (error) {
        console.error('Error getting destination balance:', error)
        return {
            raw: '0',
            formatted: '0',
            decimals: 18,
        }
    }
}

/**
 * Get the haiAERO balance on the source chain (Base)
 */
export async function getSourceBalance(userAddress: string): Promise<{
    raw: string
    formatted: string
    decimals: number
}> {
    try {
        const provider = getSourceProvider()
        const tokenContract = getSourceTokenContract(provider)

        const [balance, decimals]: [BigNumber, number] = await Promise.all([
            tokenContract.balanceOf(userAddress),
            tokenContract.decimals(),
        ])

        return {
            raw: balance.toString(),
            formatted: ethers.utils.formatUnits(balance, decimals),
            decimals,
        }
    } catch (error) {
        console.error('Error getting source balance:', error)
        return {
            raw: '0',
            formatted: '0',
            decimals: 18,
        }
    }
}


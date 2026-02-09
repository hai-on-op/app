/**
 * useMinterBridge Hook
 *
 * Hook for managing Hyperlane bridge operations for haiAERO.
 * Supports both directions: Base → Optimism and Optimism → Base.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccount, useNetwork, useSwitchNetwork, useWalletClient } from 'wagmi'
import { ethers, BigNumber } from 'ethers'
import type {
    BridgeQuote,
    BridgeApprovalState,
    BridgeTransaction,
    BridgeTransactionStatus,
    UseMinterBridgeReturn,
    BridgeTransferParams,
    BridgeDirection,
} from '~/types/bridge'
import { MinterChainId } from '~/types/minterProtocol'
import {
    getBridgeConfig,
    quoteBridgeFee,
    checkBridgeApproval,
    approveBridge,
    executeBridge,
    checkBridgeStatus,
    getBaseBalance,
    getOptimismBalance,
    validateBridgePrerequisites,
} from '~/services/hyperlane'

const THIRTY_SECONDS_MS = 30 * 1000
const FIVE_SECONDS_MS = 5 * 1000
const ONE_MINUTE_MS = 60 * 1000

/**
 * Convert wagmi wallet client to ethers signer
 */
function walletClientToSigner(walletClient: ReturnType<typeof useWalletClient>['data']): ethers.Signer | undefined {
    if (!walletClient) return undefined

    const { account, chain, transport } = walletClient
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    }
    const provider = new ethers.providers.Web3Provider(transport, network)
    return provider.getSigner(account.address)
}

function walletClientToProvider(
    walletClient: ReturnType<typeof useWalletClient>['data']
): ethers.providers.Web3Provider | undefined {
    if (!walletClient) return undefined
    const { chain, transport } = walletClient
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    }
    return new ethers.providers.Web3Provider(transport, network)
}

/**
 * Get the required chain ID for a direction
 */
function getRequiredChainId(direction: BridgeDirection): number {
    return direction === 'base-to-optimism' ? MinterChainId.BASE : MinterChainId.OPTIMISM
}

/**
 * Hook for managing Hyperlane bridge operations.
 * @param bridgeAmount - The amount to bridge (as a string)
 * @param direction - The bridge direction (default: 'base-to-optimism')
 */
export function useMinterBridge(
    bridgeAmount?: string,
    direction: BridgeDirection = 'base-to-optimism'
): UseMinterBridgeReturn & {
    baseBalance?: { raw: string; formatted: string; decimals: number }
    optimismBalance?: { raw: string; formatted: string; decimals: number }
    sourceBalance?: { raw: string; formatted: string; decimals: number }
    destinationBalance?: { raw: string; formatted: string; decimals: number }
    isOnSourceChain: boolean
    switchToSourceChain: () => void
    isWaitingForDelivery: boolean
    direction: BridgeDirection
} {
    const { address } = useAccount()
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()
    const { data: walletClient } = useWalletClient()
    const queryClient = useQueryClient()

    const config = getBridgeConfig()

    // Transaction states
    const [isApproving, setIsApproving] = useState(false)
    const [isBridging, setIsBridging] = useState(false)
    const [activeTransaction, setActiveTransaction] = useState<BridgeTransaction | undefined>()
    const [transactionHistory, setTransactionHistory] = useState<BridgeTransaction[]>([])
    const [validationError, setValidationError] = useState<string | undefined>()
    const [isValidating, setIsValidating] = useState(false)
    const [validationNonce, setValidationNonce] = useState(0)

    // Track pre-bridge destination balance for detecting delivery
    const preBridgeDestBalance = useRef<string | null>(null)
    // Flag to enable fast polling during bridge
    const [isPollingForDelivery, setIsPollingForDelivery] = useState(false)

    // Determine source and destination based on direction
    const requiredChainId = getRequiredChainId(direction)
    const isOnSourceChain = chain?.id === requiredChainId

    // Parse amount to wei
    const amountWei = useMemo(() => {
        if (!bridgeAmount) return '0'
        try {
            return ethers.utils.parseEther(bridgeAmount).toString()
        } catch {
            return '0'
        }
    }, [bridgeAmount])

    // Query for fee quote
    const {
        data: quoteData,
        isLoading: isQuoteLoading,
        refetch: refetchQuote,
    } = useQuery({
        queryKey: ['bridge', 'quote', direction, amountWei],
        enabled: Boolean(amountWei) && amountWei !== '0',
        queryFn: () => quoteBridgeFee(amountWei, direction),
        staleTime: THIRTY_SECONDS_MS,
        refetchInterval: ONE_MINUTE_MS, // Reduce polling frequency
        refetchOnWindowFocus: false,
        retry: 1,
    })

    const quote: BridgeQuote = useMemo(
        () => ({
            feeWei: quoteData?.feeWei || '0',
            feeFormatted: quoteData?.feeFormatted || '0',
            estimatedGas: quoteData?.estimatedGas || '0',
            isLoading: isQuoteLoading,
            error: quoteData?.error,
        }),
        [quoteData, isQuoteLoading]
    )

    // Query for approval state
    const {
        data: approvalData,
        isLoading: isApprovalLoading,
        refetch: refetchApproval,
    } = useQuery({
        queryKey: ['bridge', 'approval', direction, address, amountWei],
        enabled: Boolean(address) && Boolean(amountWei) && amountWei !== '0',
        queryFn: () => checkBridgeApproval(address!, amountWei, direction),
        staleTime: THIRTY_SECONDS_MS,
    })

    const approval: BridgeApprovalState = useMemo(
        () => ({
            allowance: approvalData?.allowance || '0',
            needsApproval: approvalData?.needsApproval ?? true,
            isLoading: isApprovalLoading,
        }),
        [approvalData, isApprovalLoading]
    )

    // Query for Base balance
    const { data: baseBalanceData, refetch: refetchBaseBalance } = useQuery({
        queryKey: ['bridge', 'baseBalance', address],
        enabled: Boolean(address),
        queryFn: () => getBaseBalance(address!),
        staleTime: ONE_MINUTE_MS,
        refetchOnWindowFocus: false,
        retry: 1, // Limit retries to avoid overwhelming rate-limited RPCs
    })

    // Query for Optimism balance
    // Poll every 5 seconds when waiting for bridge delivery
    const { data: optimismBalanceData, refetch: refetchOptimismBalance } = useQuery({
        queryKey: ['bridge', 'optimismBalance', address],
        enabled: Boolean(address),
        queryFn: () => getOptimismBalance(address!),
        staleTime: isPollingForDelivery ? FIVE_SECONDS_MS : ONE_MINUTE_MS,
        refetchInterval: isPollingForDelivery ? FIVE_SECONDS_MS : false,
        refetchOnWindowFocus: false,
        retry: 1,
    })

    // Determine source/destination balances based on direction
    const sourceBalance = direction === 'base-to-optimism' ? baseBalanceData : optimismBalanceData
    const destinationBalance = direction === 'base-to-optimism' ? optimismBalanceData : baseBalanceData
    const refetchSourceBalance = direction === 'base-to-optimism' ? refetchBaseBalance : refetchOptimismBalance
    const _refetchDestBalance = direction === 'base-to-optimism' ? refetchOptimismBalance : refetchBaseBalance

    // Switch to source chain
    const switchToSourceChain = useCallback(() => {
        if (switchNetwork) {
            switchNetwork(requiredChainId)
        }
    }, [switchNetwork, requiredChainId])

    // Approve tokens for bridging
    const approve = useCallback(
        async (amount: string): Promise<`0x${string}` | undefined> => {
            if (!walletClient || !address) {
                console.error('Wallet not connected')
                return undefined
            }

            if (!isOnSourceChain) {
                switchToSourceChain()
                return undefined
            }

            const signer = walletClientToSigner(walletClient)
            if (!signer) {
                console.error('Failed to get signer')
                return undefined
            }

            setIsApproving(true)
            try {
                const amountWeiLocal = ethers.utils.parseEther(amount).toString()
                const result = await approveBridge(signer, amountWeiLocal, direction)
                await result.wait()

                // Immediately refetch approval state and re-validate
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['bridge', 'approval'] }),
                    refetchApproval(),
                    refetchSourceBalance(),
                ])
                setValidationNonce((prev) => prev + 1)

                return result.txHash
            } catch (error) {
                console.error('Approval failed:', error)
                return undefined
            } finally {
                setIsApproving(false)
            }
        },
        [
            walletClient,
            address,
            isOnSourceChain,
            switchToSourceChain,
            queryClient,
            refetchApproval,
            refetchSourceBalance,
            direction,
        ]
    )

    // Execute bridge transfer
    const bridge = useCallback(
        async (params: BridgeTransferParams): Promise<`0x${string}` | undefined> => {
            if (!walletClient || !address) {
                console.error('Wallet not connected')
                return undefined
            }

            if (!isOnSourceChain) {
                switchToSourceChain()
                return undefined
            }

            const signer = walletClientToSigner(walletClient)
            if (!signer) {
                console.error('Failed to get signer')
                return undefined
            }

            // Capture pre-bridge destination balance for delivery detection
            preBridgeDestBalance.current = destinationBalance?.raw || '0'
            console.log('[Bridge] Pre-bridge destination balance:', preBridgeDestBalance.current)

            setIsBridging(true)
            const now = Date.now()

            // Determine source/dest chain IDs based on direction
            const sourceChainId =
                direction === 'base-to-optimism' ? config.sourceChain.chainId : config.destinationChain.chainId
            const destChainId =
                direction === 'base-to-optimism' ? config.destinationChain.chainId : config.sourceChain.chainId

            // Create transaction record
            const txRecord: BridgeTransaction = {
                id: `bridge-${now}`,
                amount: ethers.utils.formatEther(params.amount),
                status: 'bridging',
                initiatedAt: now,
                estimatedDeliveryAt: now + config.estimatedBridgeTimeSeconds * 1000,
                sourceChainId,
                destinationChainId: destChainId,
            }

            setActiveTransaction(txRecord)

            try {
                const result = await executeBridge(signer, params.amount, params.recipient, direction)

                // Update with tx hash and message ID
                txRecord.sourceTxHash = result.txHash
                txRecord.messageId = result.messageId
                txRecord.status = 'pending_confirmation'
                setActiveTransaction({ ...txRecord })

                // Wait for source chain confirmation
                await result.wait()

                txRecord.status = 'confirmed'
                setActiveTransaction({ ...txRecord })

                // Add to history
                setTransactionHistory((prev) => [txRecord, ...prev])

                // Refresh source balance immediately (tokens are now locked/burned)
                await refetchSourceBalance()
                setValidationNonce((prev) => prev + 1)

                // Start polling for delivery on destination chain
                console.log('[Bridge] Source tx confirmed, starting delivery polling...')
                setIsPollingForDelivery(true)

                return result.txHash
            } catch (error) {
                console.error('Bridge failed:', error)
                txRecord.status = 'failed'
                txRecord.error = error instanceof Error ? error.message : 'Bridge failed'
                setActiveTransaction({ ...txRecord })
                preBridgeDestBalance.current = null
                return undefined
            } finally {
                setIsBridging(false)
            }
        },
        [
            walletClient,
            address,
            isOnSourceChain,
            switchToSourceChain,
            config,
            refetchSourceBalance,
            destinationBalance?.raw,
            direction,
        ]
    )

    // Refresh quote
    const refreshQuote = useCallback(
        async (amount: string) => {
            const amountWeiLocal = ethers.utils.parseEther(amount).toString()
            await queryClient.invalidateQueries({ queryKey: ['bridge', 'quote', direction, amountWeiLocal] })
            await refetchQuote()
        },
        [queryClient, refetchQuote, direction]
    )

    // Check transaction status
    const checkStatus = useCallback(async (txHash: `0x${string}`): Promise<BridgeTransactionStatus> => {
        return checkBridgeStatus(txHash)
    }, [])

    // Detect bridge delivery by monitoring destination balance changes
    useEffect(() => {
        if (!isPollingForDelivery || !activeTransaction || activeTransaction.status === 'delivered') {
            return
        }

        // Check if destination balance has increased
        const currentBalance = destinationBalance?.raw || '0'
        const preBridgeBalance = preBridgeDestBalance.current || '0'

        console.log('[Bridge] Polling - Pre-bridge:', preBridgeBalance, 'Current:', currentBalance)

        try {
            const currentBN = BigNumber.from(currentBalance)
            const preBridgeBN = BigNumber.from(preBridgeBalance)

            if (currentBN.gt(preBridgeBN)) {
                // Balance increased - tokens have arrived!
                console.log('[Bridge] Delivery detected! Balance increased.')

                setActiveTransaction((prev) => (prev ? { ...prev, status: 'delivered' } : undefined))

                // Update history
                setTransactionHistory((prev) =>
                    prev.map((tx) => (tx.id === activeTransaction.id ? { ...tx, status: 'delivered' } : tx))
                )

                // Stop polling
                setIsPollingForDelivery(false)
                preBridgeDestBalance.current = null
            }
        } catch (error) {
            console.error('[Bridge] Error comparing balances:', error)
        }
    }, [isPollingForDelivery, destinationBalance?.raw, activeTransaction])

    // Timeout for delivery polling (stop after 10 minutes)
    useEffect(() => {
        if (!isPollingForDelivery) return

        const timeout = setTimeout(
            () => {
                console.log('[Bridge] Delivery polling timeout reached')
                setIsPollingForDelivery(false)
                preBridgeDestBalance.current = null
            },
            10 * 60 * 1000
        ) // 10 minutes

        return () => clearTimeout(timeout)
    }, [isPollingForDelivery])

    // Validation effect
    useEffect(() => {
        let cancelled = false

        const runValidation = async () => {
            if (!address || amountWei === '0') {
                setValidationError(undefined)
                setIsValidating(false)
                return
            }

            const sourceChainName = direction === 'base-to-optimism' ? 'Base' : 'Optimism'
            if (!isOnSourceChain) {
                setValidationError(`Switch to ${sourceChainName} network to bridge.`)
                setIsValidating(false)
                return
            }

            const walletProvider = walletClientToProvider(walletClient)
            setIsValidating(true)
            const result = await validateBridgePrerequisites(address, amountWei, direction, walletProvider)
            if (cancelled) return

            setValidationError(result.valid ? undefined : result.error || 'Bridge validation failed.')
            setIsValidating(false)
        }

        runValidation()

        return () => {
            cancelled = true
        }
    }, [address, amountWei, isOnSourceChain, validationNonce, walletClient, direction])

    return {
        config,
        quote,
        approval,
        activeTransaction,
        transactionHistory,
        approve,
        bridge,
        refreshQuote,
        checkStatus,
        validationError,
        isValidating,
        isApproving,
        isBridging,
        // Chain-specific balances
        baseBalance: baseBalanceData,
        optimismBalance: optimismBalanceData,
        // Direction-aware source/destination balances
        sourceBalance,
        destinationBalance,
        isOnSourceChain,
        switchToSourceChain,
        isWaitingForDelivery: isPollingForDelivery,
        direction,
    }
}

/**
 * Get the query key for bridge data.
 * Useful for invalidating queries from outside the hook.
 */
export function getBridgeQueryKeys(address?: string, direction?: BridgeDirection) {
    return {
        quote: (amount: string) => ['bridge', 'quote', direction, amount],
        approval: (amount: string) => ['bridge', 'approval', direction, address, amount],
        baseBalance: ['bridge', 'baseBalance', address],
        optimismBalance: ['bridge', 'optimismBalance', address],
    }
}

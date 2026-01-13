/**
 * useMinterBridge Hook
 *
 * Hook for managing Hyperlane bridge operations for haiAERO.
 * Handles quoting fees, approvals, and bridge transactions.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccount, useNetwork, useSwitchNetwork, useWalletClient } from 'wagmi'
import { ethers } from 'ethers'
import type {
    BridgeConfig,
    BridgeQuote,
    BridgeApprovalState,
    BridgeTransaction,
    BridgeTransactionStatus,
    UseMinterBridgeReturn,
    BridgeTransferParams,
} from '~/types/bridge'
import { MinterChainId } from '~/types/minterProtocol'
import {
    getBridgeConfig,
    quoteBridgeFee,
    checkBridgeApproval,
    approveBridge,
    executeBridge,
    checkBridgeStatus,
    getSourceBalance,
    getDestinationBalance,
} from '~/services/hyperlane'

const THIRTY_SECONDS_MS = 30 * 1000
const FIVE_MINUTES_MS = 5 * 60 * 1000

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

/**
 * Hook for managing Hyperlane bridge operations.
 */
export function useMinterBridge(bridgeAmount?: string): UseMinterBridgeReturn {
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
        queryKey: ['bridge', 'quote', amountWei],
        enabled: Boolean(amountWei) && amountWei !== '0',
        queryFn: () => quoteBridgeFee(amountWei),
        staleTime: THIRTY_SECONDS_MS,
        refetchInterval: THIRTY_SECONDS_MS,
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
    const { data: approvalData, isLoading: isApprovalLoading } = useQuery({
        queryKey: ['bridge', 'approval', address, amountWei],
        enabled: Boolean(address) && Boolean(amountWei) && amountWei !== '0',
        queryFn: () => checkBridgeApproval(address!, amountWei),
        staleTime: FIVE_MINUTES_MS,
    })

    const approval: BridgeApprovalState = useMemo(
        () => ({
            allowance: approvalData?.allowance || '0',
            needsApproval: approvalData?.needsApproval ?? true,
            isLoading: isApprovalLoading,
        }),
        [approvalData, isApprovalLoading]
    )

    // Query for source balance (haiAERO on Base)
    const { data: sourceBalanceData, refetch: refetchSourceBalance } = useQuery({
        queryKey: ['bridge', 'sourceBalance', address],
        enabled: Boolean(address),
        queryFn: () => getSourceBalance(address!),
        staleTime: FIVE_MINUTES_MS,
    })

    // Query for destination balance (bridged haiAERO on Optimism)
    const { data: destBalanceData, refetch: refetchDestBalance } = useQuery({
        queryKey: ['bridge', 'destBalance', address],
        enabled: Boolean(address),
        queryFn: () => getDestinationBalance(address!),
        staleTime: FIVE_MINUTES_MS,
    })

    // Check if on correct chain (Base)
    const isOnSourceChain = chain?.id === MinterChainId.BASE

    // Switch to source chain
    const switchToSourceChain = useCallback(() => {
        if (switchNetwork) {
            switchNetwork(MinterChainId.BASE)
        }
    }, [switchNetwork])

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
                const result = await approveBridge(signer, amountWeiLocal)
                await result.wait()

                // Invalidate approval query
                await queryClient.invalidateQueries({ queryKey: ['bridge', 'approval', address] })

                return result.txHash
            } catch (error) {
                console.error('Approval failed:', error)
                return undefined
            } finally {
                setIsApproving(false)
            }
        },
        [walletClient, address, isOnSourceChain, switchToSourceChain, queryClient]
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

            setIsBridging(true)
            const now = Date.now()

            // Create transaction record
            const txRecord: BridgeTransaction = {
                id: `bridge-${now}`,
                amount: ethers.utils.formatEther(params.amount),
                status: 'bridging',
                initiatedAt: now,
                estimatedDeliveryAt: now + config.estimatedBridgeTimeMinutes * 60 * 1000,
                sourceChainId: config.sourceChain.chainId,
                destinationChainId: config.destinationChain.chainId,
            }

            setActiveTransaction(txRecord)

            try {
                const result = await executeBridge(signer, params.amount, params.recipient)

                // Update with tx hash
                txRecord.sourceTxHash = result.txHash
                txRecord.status = 'pending_confirmation'
                setActiveTransaction({ ...txRecord })

                // Wait for confirmation
                await result.wait()

                txRecord.status = 'confirmed'
                setActiveTransaction({ ...txRecord })

                // Add to history
                setTransactionHistory((prev) => [txRecord, ...prev])

                // Invalidate balance queries
                await Promise.all([refetchSourceBalance(), refetchDestBalance()])

                return result.txHash
            } catch (error) {
                console.error('Bridge failed:', error)
                txRecord.status = 'failed'
                txRecord.error = error instanceof Error ? error.message : 'Bridge failed'
                setActiveTransaction({ ...txRecord })
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
            refetchDestBalance,
        ]
    )

    // Refresh quote
    const refreshQuote = useCallback(
        async (amount: string) => {
            const amountWeiLocal = ethers.utils.parseEther(amount).toString()
            await queryClient.invalidateQueries({ queryKey: ['bridge', 'quote', amountWeiLocal] })
            await refetchQuote()
        },
        [queryClient, refetchQuote]
    )

    // Check transaction status
    const checkStatus = useCallback(async (txHash: `0x${string}`): Promise<BridgeTransactionStatus> => {
        return checkBridgeStatus(txHash)
    }, [])

    // Poll for active transaction status
    useEffect(() => {
        if (!activeTransaction?.sourceTxHash || activeTransaction.status === 'delivered') {
            return
        }

        const pollStatus = async () => {
            const status = await checkBridgeStatus(activeTransaction.sourceTxHash!)
            if (status !== activeTransaction.status) {
                setActiveTransaction((prev) => (prev ? { ...prev, status } : undefined))

                if (status === 'delivered') {
                    // Update history
                    setTransactionHistory((prev) =>
                        prev.map((tx) => (tx.id === activeTransaction.id ? { ...tx, status } : tx))
                    )
                    // Refresh destination balance
                    refetchDestBalance()
                }
            }
        }

        const interval = setInterval(pollStatus, 30000) // Poll every 30 seconds
        return () => clearInterval(interval)
    }, [activeTransaction, refetchDestBalance])

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
        isApproving,
        isBridging,
        // Additional helpers
        sourceBalance: sourceBalanceData,
        destinationBalance: destBalanceData,
        isOnSourceChain,
        switchToSourceChain,
    } as UseMinterBridgeReturn & {
        sourceBalance?: { raw: string; formatted: string; decimals: number }
        destinationBalance?: { raw: string; formatted: string; decimals: number }
        isOnSourceChain: boolean
        switchToSourceChain: () => void
    }
}

/**
 * Get the query key for bridge data.
 * Useful for invalidating queries from outside the hook.
 */
export function getBridgeQueryKeys(address?: string) {
    return {
        quote: (amount: string) => ['bridge', 'quote', amount],
        approval: (amount: string) => ['bridge', 'approval', address, amount],
        sourceBalance: ['bridge', 'sourceBalance', address],
        destBalance: ['bridge', 'destBalance', address],
    }
}


/**
 * MinterProtocolProvider
 *
 * Context provider for minter protocols (haiVELO, haiAERO).
 * Manages minting state and provides account data.
 * Generalized from HaiVeloProvider to support multiple protocols.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { formatNumberWithStyle } from '~/utils'
import type {
    MinterProtocolId,
    MinterProtocolConfig,
    MinterProtocolContextValue,
    MinterSelectedToken,
    MinterMintingState,
    MinterAccountData,
} from '~/types/minterProtocol'
import { getProtocolConfig } from '~/services/minterProtocol'
import { useMinterAccount, getMinterAccountQueryKey } from '~/hooks/minter'
import { useBalance } from '~/hooks/useBalance'

// ============================================================================
// Context
// ============================================================================

const MinterProtocolContext = createContext<MinterProtocolContextValue | undefined>(undefined)

// ============================================================================
// Provider Props
// ============================================================================

interface MinterProtocolProviderProps {
    children: ReactNode
    protocolId: MinterProtocolId
    useTestnet?: boolean
}

// ============================================================================
// Provider Component
// ============================================================================

export function MinterProtocolProvider({
    children,
    protocolId,
    useTestnet = false,
}: MinterProtocolProviderProps) {
    const config = getProtocolConfig(protocolId, useTestnet)
    const queryClient = useQueryClient()

    // ========================================================================
    // Minting State
    // ========================================================================

    const [selectedToken, setSelectedToken] = useState<MinterSelectedToken>('BASE')
    const [convertAmountBase, setConvertAmountBase] = useState<string>('')
    const [convertAmountV1, setConvertAmountV1] = useState<string>('')
    const [selectedVeNftTokenIds, setSelectedVeNftTokenIds] = useState<string[]>([])

    // ========================================================================
    // Account Data
    // ========================================================================

    const { address } = useAccount()
    const addressLower = address?.toLowerCase()

    // Get V1 balance from app store if supported
    const v1TokenSymbol = config.tokens.wrappedTokenV1Symbol
    const v1Balance = useBalance(v1TokenSymbol || '')

    // Get account data from the minter hook
    const accountDataFromHook = useMinterAccount(protocolId, addressLower, useTestnet)

    // Combine with V1 balance
    const accountData: MinterAccountData = useMemo(() => ({
        ...accountDataFromHook,
        v1Balance: v1Balance?.raw || '0',
    }), [accountDataFromHook, v1Balance?.raw])

    // ========================================================================
    // Simulated Amounts
    // ========================================================================

    const simulatedAmount = useMemo(() => {
        const sanitize = (v: string) => (v ? Number(String(v).replace(/,/g, '')) : 0)
        const baseAmt = sanitize(convertAmountBase)
        const v1Amt = sanitize(convertAmountV1)

        // Calculate veNFT amount from selected NFTs
        const selectedNFTs = accountData.veNft.nfts.filter((n) =>
            selectedVeNftTokenIds.includes(n.tokenId)
        )
        const veNftAmt = selectedNFTs.reduce(
            (sum, nft) => sum + parseFloat(nft.balanceFormatted),
            0
        )

        return baseAmt + v1Amt + veNftAmt
    }, [convertAmountBase, convertAmountV1, selectedVeNftTokenIds, accountData.veNft.nfts])

    // Include current V2 wallet balance in the deposit simulation
    const simulatedDepositAmount = useMemo(() => {
        const v2Wallet = Number(accountData.v2Balance.formatted || '0')
        return simulatedAmount + (isFinite(v2Wallet) ? v2Wallet : 0)
    }, [simulatedAmount, accountData.v2Balance.formatted])

    // ========================================================================
    // Actions
    // ========================================================================

    const clearAll = () => {
        setConvertAmountBase('')
        setConvertAmountV1('')
        setSelectedVeNftTokenIds([])
    }

    const refetchAccount = async () => {
        if (!addressLower) return
        await queryClient.invalidateQueries({
            queryKey: getMinterAccountQueryKey(protocolId, addressLower),
        })
    }

    // ========================================================================
    // Context Value
    // ========================================================================

    const mintingState: MinterMintingState = {
        selectedToken,
        convertAmountBase,
        convertAmountV1,
        selectedVeNftTokenIds,
        simulatedAmount,
        simulatedDepositAmount,
    }

    const value: MinterProtocolContextValue = {
        config,
        mintingState,
        setSelectedToken,
        setConvertAmountBase,
        setConvertAmountV1,
        setSelectedVeNftTokenIds,
        clearAll,
        accountData,
        refetchAccount,
    }

    return (
        <MinterProtocolContext.Provider value={value}>
            {children}
        </MinterProtocolContext.Provider>
    )
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the minter protocol context.
 * Must be used within a MinterProtocolProvider.
 */
export function useMinterProtocol(): MinterProtocolContextValue {
    const ctx = useContext(MinterProtocolContext)
    if (!ctx) {
        throw new Error('useMinterProtocol must be used within MinterProtocolProvider')
    }
    return ctx
}

// ============================================================================
// Backward Compatibility - HaiVelo-specific exports
// ============================================================================

/**
 * Type alias for backward compatibility with HaiVeloProvider consumers.
 */
export type VeVeloNFT = {
    tokenId: string
    balance: string
    balanceFormatted: string
    lockEndTime?: string
    lockEndDate?: string
}

export type SelectedToken = 'VELO' | 'veVELO' | 'haiVELO_v1'

/**
 * Backward-compatible data shape for HaiVeloProvider consumers.
 */
export type HaiVeloData = {
    loading: boolean
    error?: Error
    veloBalance: string
    veVeloBalance: string
    veloBalanceFormatted: string
    veVeloBalanceFormatted: string
    totalVeloBalance: string
    totalVeloBalanceFormatted: string
    veVeloNFTs: VeVeloNFT[]
    haiVeloV1Balance: string
    haiVeloV1BalanceFormatted: string
    haiVeloV2Balance: string
    haiVeloV2BalanceFormatted: string
    refetch: () => Promise<void>
}

/**
 * HaiVeloProvider - Backward compatible wrapper for existing haiVELO components.
 * This provides the same interface as the original HaiVeloProvider.
 */
export function HaiVeloProviderCompat({ children }: { children: ReactNode }) {
    return (
        <MinterProtocolProvider protocolId="haiVelo">
            {children}
        </MinterProtocolProvider>
    )
}

/**
 * useHaiVeloCompat - Backward compatible hook for existing haiVELO components.
 * Maps the generic minter context to the HaiVelo-specific shape.
 */
export function useHaiVeloCompat() {
    const ctx = useMinterProtocol()

    // Map selected token to HaiVelo format
    const selectedTokenMap: Record<MinterSelectedToken, SelectedToken> = {
        BASE: 'VELO',
        VE_NFT: 'veVELO',
        V1: 'haiVELO_v1',
    }
    const reverseTokenMap: Record<SelectedToken, MinterSelectedToken> = {
        VELO: 'BASE',
        veVELO: 'VE_NFT',
        haiVELO_v1: 'V1',
    }

    const selectedToken = selectedTokenMap[ctx.mintingState.selectedToken]

    const setSelectedToken = (token: SelectedToken) => {
        ctx.setSelectedToken(reverseTokenMap[token])
    }

    // Calculate formatted values
    const veloBalanceFormatted = ctx.accountData.baseTokenBalance.formatted || '0'
    const veVeloBalanceFormatted = ctx.accountData.veNft.totalFormatted || '0'
    const totalVeloLike =
        parseFloat(veloBalanceFormatted) +
        parseFloat(veVeloBalanceFormatted) +
        parseFloat(ctx.accountData.v1Balance || '0')
    const totalVeloBalanceFormatted = formatNumberWithStyle(totalVeloLike, { maxDecimals: 2 })

    const data: HaiVeloData = {
        loading: ctx.accountData.isLoading,
        error: ctx.accountData.isError ? new Error('Failed to load account') : undefined,
        veloBalance: ctx.accountData.baseTokenBalance.raw || '0',
        veVeloBalance: ctx.accountData.veNft.totalRaw || '0',
        veloBalanceFormatted,
        veVeloBalanceFormatted,
        totalVeloBalance: String(totalVeloLike),
        totalVeloBalanceFormatted,
        veVeloNFTs: ctx.accountData.veNft.nfts.map((n) => ({
            tokenId: n.tokenId,
            balance: n.balance,
            balanceFormatted: n.balanceFormatted,
            lockEndTime: n.lockEndTime,
            lockEndDate: n.lockEndDate,
        })),
        haiVeloV1Balance: ctx.accountData.v1Balance || '0',
        haiVeloV1BalanceFormatted: ctx.accountData.v1Balance || '0',
        haiVeloV2Balance: ctx.accountData.v2Balance.raw || '0',
        haiVeloV2BalanceFormatted: ctx.accountData.v2Balance.formatted || '0',
        refetch: ctx.refetchAccount,
    }

    return {
        selectedToken,
        setSelectedToken,
        convertAmountVelo: ctx.mintingState.convertAmountBase,
        setConvertAmountVelo: ctx.setConvertAmountBase,
        convertAmountHaiVeloV1: ctx.mintingState.convertAmountV1,
        setConvertAmountHaiVeloV1: ctx.setConvertAmountV1,
        selectedVeVeloNFTs: ctx.mintingState.selectedVeNftTokenIds,
        setSelectedVeVeloNFTs: ctx.setSelectedVeNftTokenIds,
        simulatedAmount: ctx.mintingState.simulatedAmount,
        simulatedDepositAmount: ctx.mintingState.simulatedDepositAmount,
        clearAll: ctx.clearAll,
        data,
    }
}


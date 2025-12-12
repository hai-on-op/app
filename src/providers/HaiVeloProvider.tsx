import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { useBalance } from '~/hooks/useBalance'
import { formatNumberWithStyle } from '~/utils'
import { useHaiVeloAccount } from '~/hooks/haivelo/useHaiVeloAccount'
import { useQueryClient } from '@tanstack/react-query'

// This provider now delegates all balance reads to react-query hooks.

export type VeVeloNFT = {
    tokenId: string
    balance: string
    balanceFormatted: string
    lockEndTime?: string
    lockEndDate?: string
}

export type SelectedToken = 'VELO' | 'veVELO' | 'haiVELO_v1'

type HaiVeloData = {
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

type HaiVeloContextValue = {
    // minting state
    selectedToken: SelectedToken
    setSelectedToken: (token: SelectedToken) => void
    convertAmountVelo: string
    setConvertAmountVelo: (value: string) => void
    convertAmountHaiVeloV1: string
    setConvertAmountHaiVeloV1: (value: string) => void
    selectedVeVeloNFTs: string[]
    setSelectedVeVeloNFTs: (values: string[]) => void
    simulatedAmount: number
    simulatedDepositAmount: number
    clearAll: () => void

    // balance data
    data: HaiVeloData
}

const HaiVeloContext = createContext<HaiVeloContextValue | undefined>(undefined)

export function HaiVeloProvider({ children }: { children: ReactNode }) {
    // minting state
    const [selectedToken, setSelectedToken] = useState<SelectedToken>('VELO')
    const [convertAmountVelo, setConvertAmountVelo] = useState<string>('')
    const [convertAmountHaiVeloV1, setConvertAmountHaiVeloV1] = useState<string>('')
    const [selectedVeVeloNFTs, setSelectedVeVeloNFTs] = useState<string[]>([])

    // balance fetching moved to hooks
    const { address } = useAccount()
    const addressLower = address?.toLowerCase()
    const queryClient = useQueryClient()
    const haiVeloV1 = useBalance('HAIVELO')
    const { v2Balance, velo, veNft, isLoading, isError } = useHaiVeloAccount(addressLower)

    const formattedData = useMemo(() => {
        const veloFormatted = velo.formatted || '0'
        const veVeloFormatted = veNft.totalFormatted || '0'
        const totalVeloLike =
            parseFloat(veloFormatted) + parseFloat(veVeloFormatted) + parseFloat(haiVeloV1?.raw || '0')
        const totalFormatted = formatNumberWithStyle(totalVeloLike, { maxDecimals: 2 })

        return {
            veloBalanceFormatted: veloFormatted,
            veVeloBalanceFormatted: veVeloFormatted,
            totalVeloBalance: String(totalVeloLike),
            totalVeloBalanceFormatted: totalFormatted,
        }
    }, [velo.formatted, veNft.totalFormatted, haiVeloV1?.raw])

    const data: HaiVeloData = {
        loading: isLoading,
        error: isError ? new Error('Failed to load haiVELO account') : undefined,
        veloBalance: velo.raw || '0',
        veVeloBalance: veNft.totalRaw || '0',
        veVeloNFTs: (veNft.nfts || []).map((n) => ({
            tokenId: n.tokenId,
            balance: n.balance,
            balanceFormatted: n.balanceFormatted,
        })),
        ...formattedData,
        haiVeloV1Balance: haiVeloV1?.e18 || '0',
        haiVeloV1BalanceFormatted: haiVeloV1?.raw || '0',
        haiVeloV2Balance: v2Balance.raw || '0',
        haiVeloV2BalanceFormatted: v2Balance.formatted || '0',
        refetch: async () => {
            if (!addressLower) return
            await queryClient.invalidateQueries({ queryKey: ['haivelo', 'account', addressLower] })
        },
    }

    const simulatedAmount = useMemo(() => {
        const sanitize = (v: string) => (v ? Number(String(v).replace(/,/g, '')) : 0)
        const veloAmt = sanitize(convertAmountVelo)
        const haiVeloV1Amt = sanitize(convertAmountHaiVeloV1)

        const selectedNFTs: Array<{ tokenId: string; balanceFormatted: string }> = (veNft.nfts || []).filter((n) =>
            selectedVeVeloNFTs.includes(n.tokenId)
        )
        const veVeloAmt = selectedNFTs.reduce((sum: number, nft) => sum + parseFloat(nft.balanceFormatted), 0)

        return veloAmt + haiVeloV1Amt + veVeloAmt
    }, [convertAmountVelo, convertAmountHaiVeloV1, selectedVeVeloNFTs, veNft.nfts])

    // Include current haiVELO v2 wallet balance in the deposit simulation
    const simulatedDepositAmount = useMemo(() => {
        const v2Wallet = Number(data.haiVeloV2BalanceFormatted || '0')
        return simulatedAmount + (isFinite(v2Wallet) ? v2Wallet : 0)
    }, [simulatedAmount, data.haiVeloV2BalanceFormatted])

    const clearAll = () => {
        setConvertAmountVelo('')
        setConvertAmountHaiVeloV1('')
        setSelectedVeVeloNFTs([])
    }

    const value: HaiVeloContextValue = {
        selectedToken,
        setSelectedToken,
        convertAmountVelo,
        setConvertAmountVelo,
        convertAmountHaiVeloV1,
        setConvertAmountHaiVeloV1,
        selectedVeVeloNFTs,
        setSelectedVeVeloNFTs,
        simulatedAmount,
        simulatedDepositAmount,
        clearAll,
        data,
    }

    return <HaiVeloContext.Provider value={value}>{children}</HaiVeloContext.Provider>
}

export function useHaiVelo(): HaiVeloContextValue {
    const ctx = useContext(HaiVeloContext)
    if (!ctx) throw new Error('useHaiVelo must be used within HaiVeloProvider')
    return ctx
}

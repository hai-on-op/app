import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useHaiVeloV2 } from '~/hooks'

export type SelectedToken = 'VELO' | 'veVELO' | 'haiVELO_v1'

type HaiVeloContextValue = {
    selectedToken: SelectedToken
    setSelectedToken: (token: SelectedToken) => void

    convertAmountVelo: string
    setConvertAmountVelo: (value: string) => void

    convertAmountHaiVeloV1: string
    setConvertAmountHaiVeloV1: (value: string) => void

    selectedVeVeloNFTs: string[]
    setSelectedVeVeloNFTs: (values: string[]) => void

    simulatedAmount: number

    clearAll: () => void
}

const HaiVeloContext = createContext<HaiVeloContextValue | undefined>(undefined)

export function HaiVeloProvider({ children }: { children: ReactNode }) {
    const [selectedToken, setSelectedToken] = useState<SelectedToken>('VELO')
    const [convertAmountVelo, setConvertAmountVelo] = useState<string>('')
    const [convertAmountHaiVeloV1, setConvertAmountHaiVeloV1] = useState<string>('')
    const [selectedVeVeloNFTs, setSelectedVeVeloNFTs] = useState<string[]>([])

    const { veVeloNFTs } = useHaiVeloV2()

    const simulatedAmount = useMemo(() => {
        const sanitize = (v: string) => (v ? Number(String(v).replace(/,/g, '')) : 0)
        const veloAmt = sanitize(convertAmountVelo)
        const haiVeloV1Amt = sanitize(convertAmountHaiVeloV1)

        const selectedNFTs = veVeloNFTs.filter((nft) => selectedVeVeloNFTs.includes(nft.tokenId))
        const veVeloAmt = selectedNFTs.reduce((sum, nft) => sum + parseFloat(nft.balanceFormatted), 0)

        return veloAmt + haiVeloV1Amt + veVeloAmt
    }, [convertAmountVelo, convertAmountHaiVeloV1, selectedVeVeloNFTs, veVeloNFTs])

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
        clearAll,
    }

    return <HaiVeloContext.Provider value={value}>{children}</HaiVeloContext.Provider>
}

export function useHaiVelo(): HaiVeloContextValue {
    const ctx = useContext(HaiVeloContext)
    if (!ctx) throw new Error('useHaiVelo must be used within HaiVeloProvider')
    return ctx
}


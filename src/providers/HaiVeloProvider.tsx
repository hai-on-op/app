import { createContext, useContext, useMemo, useState, type ReactNode, useCallback, useEffect } from 'react'
import { BigNumber } from '@ethersproject/bignumber'
import { formatEther } from '@ethersproject/units'
import { useAccount } from 'wagmi'
import { useContract } from '~/hooks/useContract'
import {
    HAI_VELO_ADDRESSES,
    VELO_TOKEN_ADDRESS,
    VE_NFT_CONTRACT_ADDRESS,
    HAI_VELO_V2_TOKEN_ADDRESS,
} from '~/services/haiVeloService'
import { useBalance } from '~/hooks/useBalance'
import { formatNumberWithStyle } from '~/utils'

// Contract addresses (centralized)
const VELO_ADDRESS = VELO_TOKEN_ADDRESS
const VE_ADDRESS = VE_NFT_CONTRACT_ADDRESS
const HAIVELO_V2_ADDRESS = HAI_VELO_V2_TOKEN_ADDRESS

// ABIs
const VELO_ABI = ['function balanceOf(address account) view returns (uint256)']
const VE_ABI = [
    'function balanceOf(address _owner) view returns (uint256)',
    'function ownerToNFTokenIdList(address _owner, uint256 _index) view returns (uint256)',
    'function balanceOfNFT(uint256 _tokenId) view returns (uint256)',
]

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

    // balance fetching
    const { address } = useAccount()
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<Error | undefined>(undefined)
    const [veloBalance, setVeloBalance] = useState<string>('0')
    const [veVeloBalance, setVeVeloBalance] = useState<string>('0')
    const [veVeloNFTs, setVeVeloNFTs] = useState<VeVeloNFT[]>([])
    const [haiVeloV2Balance, setHaiVeloV2Balance] = useState<string>('0')

    const haiVeloV1 = useBalance('HAIVELO')

    const veloContract = useContract(VELO_ADDRESS, VELO_ABI, false)
    const veContract = useContract(VE_ADDRESS, VE_ABI, false)
    const haiVeloV2Contract = useContract(HAIVELO_V2_ADDRESS, VELO_ABI, false)

    const fetchBalances = useCallback(async () => {
        if (!address || !veloContract || !veContract || !haiVeloV2Contract) {
            setVeloBalance('0')
            setVeVeloBalance('0')
            setHaiVeloV2Balance('0')
            return
        }

        setLoading(true)
        setError(undefined)

        try {
            const [veloBalanceBN, haiVeloV2BalanceBN, numNFTs] = await Promise.all([
                veloContract.balanceOf(address),
                haiVeloV2Contract.balanceOf(address),
                veContract.balanceOf(address),
            ])

            setVeloBalance(veloBalanceBN.toString())
            setHaiVeloV2Balance(haiVeloV2BalanceBN.toString())

            let veVeloBalanceBN = BigNumber.from(0)
            if (numNFTs.gt(0)) {
                const nftCount = numNFTs.toNumber()
                const tokenIdPromises = []
                for (let i = 0; i < nftCount; i++) {
                    tokenIdPromises.push(veContract.ownerToNFTokenIdList(address, i))
                }
                const tokenIds = await Promise.all(tokenIdPromises)

                const balancePromises = tokenIds.map((tokenId) => veContract.balanceOfNFT(tokenId))
                const nftBalances = await Promise.all(balancePromises)

                const nftData: VeVeloNFT[] = tokenIds.map((tokenId, index) => ({
                    tokenId: tokenId.toString(),
                    balance: nftBalances[index].toString(),
                    balanceFormatted: formatEther(nftBalances[index]),
                }))
                setVeVeloNFTs(nftData)

                veVeloBalanceBN = nftBalances.reduce((total, balance) => total.add(balance), BigNumber.from(0))
            } else {
                setVeVeloNFTs([])
            }
            setVeVeloBalance(veVeloBalanceBN.toString())
        } catch (err) {
            console.error('Error fetching VELO/veVELO/haiVELO v2 balances:', err)
            setError(err instanceof Error ? err : new Error('Failed to fetch balances'))
            setVeloBalance('0')
            setVeVeloBalance('0')
            setHaiVeloV2Balance('0')
        } finally {
            setLoading(false)
        }
    }, [address, veloContract, veContract, haiVeloV2Contract])

    useEffect(() => {
        fetchBalances()
    }, [fetchBalances])

    const formattedData = useMemo(() => {
        const veloFormatted = formatEther(veloBalance)
        const veVeloFormatted = formatEther(veVeloBalance)

        const veloBN = BigNumber.from(veloBalance)
        const veVeloBN = BigNumber.from(veVeloBalance)
        const totalBN = veloBN.add(veVeloBN)

        const totalVeloLike = parseFloat(formatEther(totalBN)) + parseFloat(haiVeloV1?.raw || '0')
        const totalFormatted = formatNumberWithStyle(totalVeloLike, { maxDecimals: 2 })

        return {
            veloBalanceFormatted: veloFormatted,
            veVeloBalanceFormatted: veVeloFormatted,
            totalVeloBalance: totalBN.toString(),
            totalVeloBalanceFormatted: totalFormatted,
        }
    }, [veloBalance, veVeloBalance, haiVeloV1?.raw])

    const data: HaiVeloData = {
        loading,
        error,
        veloBalance,
        veVeloBalance,
        veVeloNFTs,
        ...formattedData,
        haiVeloV1Balance: haiVeloV1?.e18 || '0',
        haiVeloV1BalanceFormatted: haiVeloV1?.raw || '0',
        haiVeloV2Balance: haiVeloV2Balance,
        haiVeloV2BalanceFormatted: formatEther(haiVeloV2Balance),
        refetch: fetchBalances,
    }

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
        data,
    }

    return <HaiVeloContext.Provider value={value}>{children}</HaiVeloContext.Provider>
}

export function useHaiVelo(): HaiVeloContextValue {
    const ctx = useContext(HaiVeloContext)
    if (!ctx) throw new Error('useHaiVelo must be used within HaiVeloProvider')
    return ctx
}


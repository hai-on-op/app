import { useState, useEffect, useMemo } from 'react'
import { BigNumber } from '@ethersproject/bignumber'
import { formatEther } from '@ethersproject/units'
import { useAccount } from 'wagmi'

import { usePublicProvider } from './useEthersAdapters'
import { useContract } from './useContract'

// Contract addresses on Optimism
const VELO_ADDRESS = '0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db'
const VE_ADDRESS = '0xFAf8FD17D9840595845582fCB047DF13f006787d'

// Minimal ABI for VELO (ERC-20)
const VELO_ABI = [
    'function balanceOf(address account) view returns (uint256)',
]

// Minimal ABI for veVELO (VotingEscrow)
const VE_ABI = [
    'function balanceOf(address _owner) view returns (uint256)',
    'function ownerToNFTokenIdList(address _owner, uint256 _index) view returns (uint256)',
    'function balanceOfNFT(uint256 _tokenId) view returns (uint256)',
]

export type HaiVeloV2Data = {
    loading: boolean
    error?: Error
    veloBalance: string
    veVeloBalance: string
    veloBalanceFormatted: string
    veVeloBalanceFormatted: string
    totalVeloBalance: string
    totalVeloBalanceFormatted: string
}

export function useHaiVeloV2(): HaiVeloV2Data {
    const { address } = useAccount()
    
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<Error | undefined>(undefined)
    const [veloBalance, setVeloBalance] = useState<string>('0')
    const [veVeloBalance, setVeVeloBalance] = useState<string>('0')

    // Get contract instances
    const veloContract = useContract(VELO_ADDRESS, VELO_ABI, false)
    const veContract = useContract(VE_ADDRESS, VE_ABI, false)

    // Fetch balances function
    const fetchBalances = async () => {
        if (!address || !veloContract || !veContract) {
            setVeloBalance('0')
            setVeVeloBalance('0')
            return
        }

        setLoading(true)
        setError(undefined)

        try {
            // Fetch VELO balance
            const veloBalanceBN = await veloContract.balanceOf(address)
            const veloBalanceStr = veloBalanceBN.toString()
            setVeloBalance(veloBalanceStr)

            // Fetch veVELO total voting power
            const numNFTs = await veContract.balanceOf(address)
            let veVeloBalanceBN = BigNumber.from(0)

            // If user has NFTs, fetch their voting power
            if (numNFTs.gt(0)) {
                const nftCount = numNFTs.toNumber()
                
                // Fetch all NFT token IDs for the user
                const tokenIdPromises = []
                for (let i = 0; i < nftCount; i++) {
                    tokenIdPromises.push(veContract.ownerToNFTokenIdList(address, i))
                }
                const tokenIds = await Promise.all(tokenIdPromises)

                // Fetch voting power for each NFT
                const balancePromises = tokenIds.map(tokenId => 
                    veContract.balanceOfNFT(tokenId)
                )
                const nftBalances = await Promise.all(balancePromises)

                // Sum up all voting powers
                veVeloBalanceBN = nftBalances.reduce((total, balance) => 
                    total.add(balance), BigNumber.from(0)
                )
            }

            setVeVeloBalance(veVeloBalanceBN.toString())

        } catch (err) {
            console.error('Error fetching VELO/veVELO balances:', err)
            setError(err instanceof Error ? err : new Error('Failed to fetch balances'))
            setVeloBalance('0')
            setVeVeloBalance('0')
        } finally {
            setLoading(false)
        }
    }

    // Fetch balances when address or contracts change
    useEffect(() => {
        fetchBalances()
    }, [address, veloContract, veContract])

    // Format balances for display
    const formattedData = useMemo(() => {
        const veloFormatted = formatEther(veloBalance)
        const veVeloFormatted = formatEther(veVeloBalance)
        
        // Calculate total VELO (VELO + veVELO)
        const veloBN = BigNumber.from(veloBalance)
        const veVeloBN = BigNumber.from(veVeloBalance)
        const totalBN = veloBN.add(veVeloBN)
        const totalFormatted = formatEther(totalBN)

        return {
            veloBalanceFormatted: veloFormatted,
            veVeloBalanceFormatted: veVeloFormatted,
            totalVeloBalance: totalBN.toString(),
            totalVeloBalanceFormatted: totalFormatted,
        }
    }, [veloBalance, veVeloBalance])

    return {
        loading,
        error,
        veloBalance,
        veVeloBalance,
        ...formattedData,
    }
} 
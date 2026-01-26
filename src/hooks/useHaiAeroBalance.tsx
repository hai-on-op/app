/**
 * Custom hook to fetch haiAERO balance on Optimism
 *
 * This is needed because the SDK doesn't have HAIAERO configured yet,
 * so we fetch the balance directly from the contract.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useNetwork } from 'wagmi'
import { ethers } from 'ethers'

import type { FormattedBalance } from '~/types'
import { formatBalance } from '~/utils'
import { getOptimismBalance } from '~/services/hyperlane'
import { MinterChainId } from '~/types/minterProtocol'

/**
 * Hook to fetch haiAERO balance on Optimism
 * Returns a FormattedBalance object compatible with useBalance
 */
export function useHaiAeroBalance(): FormattedBalance & { refetch: () => void } {
    const { address } = useAccount()
    const { chain } = useNetwork()
    const [balance, setBalance] = useState<FormattedBalance>(formatBalance('0'))

    const fetchBalance = useCallback(async () => {
        if (!address) {
            setBalance(formatBalance('0'))
            return
        }

        // Only fetch on Optimism network
        if (chain?.id !== MinterChainId.OPTIMISM) {
            setBalance(formatBalance('0'))
            return
        }

        try {
            const result = await getOptimismBalance(address)
            // Convert to E18 format for consistency with other balances
            const balanceE18 = ethers.utils.parseUnits(result.formatted, 18).toString()
            setBalance(formatBalance(balanceE18))
        } catch (error) {
            console.error('[useHaiAeroBalance] Error fetching balance:', error)
            setBalance(formatBalance('0'))
        }
    }, [address, chain?.id])

    // Fetch balance on mount and when dependencies change
    useEffect(() => {
        fetchBalance()
    }, [fetchBalance])

    // Also poll every 10 seconds for updates
    useEffect(() => {
        const interval = setInterval(fetchBalance, 10000)
        return () => clearInterval(interval)
    }, [fetchBalance])

    return {
        ...balance,
        refetch: fetchBalance,
    }
}

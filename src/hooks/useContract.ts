import { useMemo } from 'react'
import { Contract } from '@ethersproject/contracts'
import { JsonRpcSigner, Web3Provider, JsonRpcProvider } from '@ethersproject/providers'

import { EMPTY_ADDRESS, NETWORK_ID, isAddress } from '~/utils'
import { useEthersSigner, usePublicProvider } from '~/hooks'

import ERC20_BYTES32_ABI from '~/abis/erc20_bytes32.json'
import ERC20_ABI from '~/abis/erc20.json'
import MERKLE_DISTRIBUTOR_ABI from '~/abis/MerkleDistributor.json'
import { Erc20 } from '~/abis/Erc20'

// account is not optional
export function getSigner(library: Web3Provider, account: string): JsonRpcSigner {
    return library.getSigner(account).connectUnchecked()
}

// account is optional
export function getProviderOrSigner(library: Web3Provider, account?: string): Web3Provider | JsonRpcSigner {
    return account ? getSigner(library, account) : library
}

// account is optional
export function getContract(address: string, ABI: any, signerOrProvider: JsonRpcSigner | JsonRpcProvider): Contract {
    if (!isAddress(address) || address === EMPTY_ADDRESS) {
        throw Error(`Invalid 'address' parameter '${address}'.`)
    }

    return new Contract(address, ABI, signerOrProvider)
}

/**
 * Hook to get a contract instance.
 *
 * @param addressOrAddressMap - Contract address or map of chainId to address
 * @param ABI - Contract ABI
 * @param readOnly - If true, always use public provider even when signer is available.
 *                   This is useful for read-only queries that should always go to Optimism
 *                   regardless of which network the user is connected to (e.g., when on Base).
 *                   Defaults to false for backward compatibility.
 */
export function useContract<T extends Contract = Contract>(
    addressOrAddressMap: string | { [chainId: number]: string } | undefined,
    ABI: any,
    readOnly: boolean = false
): T | null {
    const provider = usePublicProvider()
    const signer = useEthersSigner()

    return useMemo(() => {
        if (!addressOrAddressMap || !ABI || !provider) return null
        let address: string | undefined
        if (typeof addressOrAddressMap === 'string') address = addressOrAddressMap
        else address = addressOrAddressMap[NETWORK_ID]
        if (!address) return null
        try {
            // Use public provider for read-only operations, or when signer is not available
            const signerOrProvider = readOnly ? (provider as JsonRpcProvider) : (signer || (provider as JsonRpcProvider))
            return getContract(address, ABI, signerOrProvider)
        } catch (error) {
            console.error('Failed to get contract', error)
            return null
        }
    }, [addressOrAddressMap, ABI, provider, signer, readOnly]) as T
}

/**
 * Hook to get an ERC20 token contract.
 * @param tokenAddress - Token contract address
 * @param readOnly - If true, use public provider (for cross-chain compatibility)
 */
export function useTokenContract(tokenAddress?: string, readOnly?: boolean) {
    return useContract<Erc20>(tokenAddress, ERC20_ABI, readOnly)
}

/**
 * Hook to get a merkle distributor contract.
 * @param tokenAddress - Distributor contract address
 * @param readOnly - If true, use public provider (for cross-chain compatibility)
 */
export function useDistributorContract(tokenAddress?: string, readOnly?: boolean) {
    return useContract(tokenAddress, MERKLE_DISTRIBUTOR_ABI, readOnly)
}

/**
 * Hook to get an ERC20 bytes32 token contract.
 * @param tokenAddress - Token contract address
 * @param readOnly - If true, use public provider (for cross-chain compatibility)
 */
export function useBytes32TokenContract(tokenAddress?: string, readOnly?: boolean): Contract | null {
    return useContract(tokenAddress, ERC20_BYTES32_ABI, readOnly)
}

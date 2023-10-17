import { useMemo } from 'react'
import { Contract } from '@ethersproject/contracts'
import { JsonRpcSigner, Web3Provider, JsonRpcProvider } from '@ethersproject/providers'
import { useEthersProvider, useEthersSigner } from '@/hooks'
import { useNetwork } from 'wagmi'

import { EMPTY_ADDRESS } from '@/utils/constants'
import ERC20_BYTES32_ABI from '@/abis/erc20_bytes32.json'
import { isAddress } from '@/utils/helper'
import ERC20_ABI from '@/abis/erc20.json'
import { Erc20 } from '@/abis/Erc20'

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

// returns null on errors
export function useContract<T extends Contract = Contract>(
    addressOrAddressMap: string | { [chainId: number]: string } | undefined,
    ABI: any
): T | null {
    const { chain } = useNetwork()
    const chainId = chain?.id
    const provider = useEthersProvider()
    const signer = useEthersSigner()

    return useMemo(() => {
        if (!addressOrAddressMap || !ABI || !provider || !chainId) return null
        let address: string | undefined
        if (typeof addressOrAddressMap === 'string') address = addressOrAddressMap
        else address = addressOrAddressMap[chainId]
        if (!address) return null
        try {
            return getContract(address, ABI, signer || (provider as JsonRpcProvider))
        } catch (error) {
            console.error('Failed to get contract', error)
            return null
        }
    }, [addressOrAddressMap, ABI, provider, chainId, signer]) as T
}

export function useTokenContract(tokenAddress?: string) {
    return useContract<Erc20>(tokenAddress, ERC20_ABI)
}

export function useBytes32TokenContract(tokenAddress?: string): Contract | null {
    return useContract(tokenAddress, ERC20_BYTES32_ABI)
}

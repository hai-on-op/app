import { ethers } from 'ethers'

import type { AeroV2ChainId } from './types'

const providers: Partial<Record<AeroV2ChainId, ethers.providers.JsonRpcProvider>> = {}

export function getAeroV2Provider(chainId: AeroV2ChainId): ethers.providers.JsonRpcProvider {
    if (chainId !== 10 && chainId !== 8453) throw new Error('Unsupported haiAERO v2 chain.')
    let provider = providers[chainId]
    if (!provider) {
        const rpc =
            chainId === 10
                ? import.meta.env.VITE_MAINNET_PUBLIC_RPC || 'https://mainnet.optimism.io'
                : import.meta.env.VITE_PUBLIC_BASE_RPC || 'https://mainnet.base.org'
        provider = new ethers.providers.JsonRpcProvider(rpc, chainId)
        providers[chainId] = provider
    }
    return provider
}

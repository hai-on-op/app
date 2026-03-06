import { useMemo } from 'react'
import { providers } from 'ethers'
import { createPublicClient, http, type HttpTransport } from 'viem'
import { optimism, optimismSepolia } from 'viem/chains'
import { type PublicClient, type WalletClient, usePublicClient, useWalletClient } from 'wagmi'

import { NETWORK_ID, VITE_MAINNET_PUBLIC_RPC, VITE_TESTNET_PUBLIC_RPC } from '~/utils'

/**
 * Returns a public client for Optimism that is independent of the user's connected network.
 * This is used for read-only queries to Optimism contracts regardless of which chain
 * the user is connected to (e.g., when user is on Base for haiAERO minting).
 *
 * Uses NETWORK_ID (the target Optimism network) rather than the user's current chain.
 */
export const useCustomPublicClient = (): PublicClient => {
    // Always use NETWORK_ID (target Optimism network) rather than user's current chain
    // This ensures Optimism data queries work even when user is on Base or other networks
    const targetChainId = NETWORK_ID

    const testnetClient = createPublicClient({
        chain: optimismSepolia,
        transport: http(VITE_TESTNET_PUBLIC_RPC, { batch: true }),
    })
    const mainnetClient = createPublicClient({
        chain: optimism,
        transport: http(VITE_MAINNET_PUBLIC_RPC, { batch: true }),
    })

    if (targetChainId === 10) return mainnetClient as PublicClient
    return testnetClient as PublicClient
}

export function publicClientToProvider(publicClient: PublicClient) {
    const { chain, transport } = publicClient
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    }
    if (transport.type === 'fallback')
        return new providers.FallbackProvider(
            (transport.transports as ReturnType<HttpTransport>[]).map(
                ({ value }) => new providers.JsonRpcProvider(value?.url, network)
            )
        )
    return new providers.JsonRpcProvider(transport.url, network)
}

/** Hook to convert a viem Public Client to an ethers.js Provider. */
export function useEthersProvider({ chainId }: { chainId?: number } = {}) {
    const publicClient = usePublicClient({ chainId })
    return useMemo(() => publicClientToProvider(publicClient), [publicClient])
}

export function usePublicProvider() {
    const client = useCustomPublicClient()
    return useMemo(
        () =>
            new providers.JsonRpcProvider(client.transport.url, {
                chainId: client.chain.id,
                name: client.chain.name,
            }),
        [client.chain.id, client.chain.name, client.transport.url]
    )
}

export function walletClientToSigner(walletClient: WalletClient) {
    const { account, chain, transport } = walletClient
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    }
    const provider = new providers.Web3Provider(transport, network)
    const signer = provider.getSigner(account.address)
    return signer
}

/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
    const { data: walletClient } = useWalletClient({ chainId })
    return useMemo(() => (walletClient ? walletClientToSigner(walletClient) : undefined), [walletClient])
}

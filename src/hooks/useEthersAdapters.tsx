import { useMemo } from 'react'
import { type PublicClient, usePublicClient, type WalletClient, useWalletClient } from 'wagmi'
import { providers } from 'ethers'
import { createPublicClient, http, type HttpTransport } from 'viem'
import { optimismGoerli } from 'viem/chains'
import { VITE_PUBLIC_RPC } from '~/utils'

export const client = createPublicClient({
    chain: optimismGoerli,
    transport: http(VITE_PUBLIC_RPC, { batch: true }),
})

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
    return useMemo(
        () =>
            new providers.JsonRpcProvider(client.transport.url, {
                chainId: client.chain.id,
                name: client.chain.name,
            }),
        []
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

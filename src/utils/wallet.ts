import { configureChains, createConfig } from 'wagmi'
import { optimism, optimismGoerli, optimismSepolia } from 'wagmi/chains'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { publicProvider } from 'wagmi/providers/public'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { injectedWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'

import { NETWORK_ID, VITE_MAINNET_PUBLIC_RPC, VITE_TESTNET_PUBLIC_RPC, VITE_WALLETCONNECT_ID } from './constants'

const projectId = VITE_WALLETCONNECT_ID!

const chains = [NETWORK_ID === 10 ? optimism : NETWORK_ID === 420 ? optimismGoerli : optimismSepolia]
const { publicClient } = configureChains(chains, [
    jsonRpcProvider({
        rpc: (chain) => {
            const url = chain.id === optimism.id ? VITE_MAINNET_PUBLIC_RPC : VITE_TESTNET_PUBLIC_RPC
            return url ? { http: url } : null
        },
    }),
    publicProvider(),
])

const connectors = connectorsForWallets([
    {
        groupName: 'Recommended',
        wallets: [
            injectedWallet({ chains }),
            rainbowWallet({ projectId, chains }),
            walletConnectWallet({ projectId, chains }),
        ],
    },
])

const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
})

export { wagmiConfig, chains }

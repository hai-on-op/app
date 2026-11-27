import { configureChains, createConfig } from 'wagmi'
import { optimism, optimismGoerli, optimismSepolia, base, baseSepolia } from 'wagmi/chains'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { publicProvider } from 'wagmi/providers/public'

import {
    NETWORK_ID,
    VITE_MAINNET_PUBLIC_RPC,
    VITE_TESTNET_PUBLIC_RPC,
    VITE_PUBLIC_BASE_RPC,
    VITE_WALLETCONNECT_ID,
} from './constants'
import { connectorsForWallets } from './connectorsForWallets'
import { injectedWallet, rainbowWallet, walletConnectWallet } from './rainbowkitWallets'

const projectId = VITE_WALLETCONNECT_ID!

// Configure primary Optimism chain based on network ID
const primaryChain = NETWORK_ID === 10 ? optimism : NETWORK_ID === 420 ? optimismGoerli : optimismSepolia
// Include Base chain for haiAERO minting (Base mainnet for prod, Base Sepolia for testnet)
const baseChain = NETWORK_ID === 10 ? base : baseSepolia

// Wallets may add a network outside the app's origin. Keep their public chain defaults.
const chains = [primaryChain, baseChain]
const { publicClient } = configureChains(chains, [
    jsonRpcProvider({
        rpc: (chain) => {
            const url =
                chain.id === optimism.id
                    ? VITE_MAINNET_PUBLIC_RPC
                    : chain.id === base.id
                    ? VITE_PUBLIC_BASE_RPC
                    : chain.id === primaryChain.id
                    ? VITE_TESTNET_PUBLIC_RPC
                    : undefined
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

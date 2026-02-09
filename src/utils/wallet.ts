import { configureChains, createConfig } from 'wagmi'
import { optimism, optimismGoerli, optimismSepolia, base, baseSepolia } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { injectedWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'

import { NETWORK_ID, VITE_ALCHEMY_KEY, VITE_WALLETCONNECT_ID } from './constants'

const projectId = VITE_WALLETCONNECT_ID!

// Configure primary Optimism chain based on network ID
const primaryChain = NETWORK_ID === 10 ? optimism : NETWORK_ID === 420 ? optimismGoerli : optimismSepolia
// Include Base chain for haiAERO minting (Base mainnet for prod, Base Sepolia for testnet)
const baseChain = NETWORK_ID === 10 ? base : baseSepolia

const { chains, publicClient } = configureChains(
    [primaryChain, baseChain],
    [alchemyProvider({ apiKey: VITE_ALCHEMY_KEY! }), publicProvider()]
)

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

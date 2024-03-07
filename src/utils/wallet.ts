import { configureChains, createConfig } from 'wagmi'
import { optimism, optimismGoerli, optimismSepolia } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { injectedWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'

import { NETWORK_ID, VITE_ALCHEMY_KEY, VITE_WALLETCONNECT_ID } from './constants'

const projectId = VITE_WALLETCONNECT_ID!

const { chains, publicClient } = configureChains(
    [NETWORK_ID === 10 ? optimism : NETWORK_ID === 420 ? optimismGoerli : optimismSepolia],
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

import React from 'react'
import ReactDOM from 'react-dom'
import { HashRouter } from 'react-router-dom'
import { StoreProvider } from 'easy-peasy'
import './index.css'
import App from './App'
import store from './store'
import { HelmetProvider } from 'react-helmet-async'

import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { configureChains, createConfig, WagmiConfig } from 'wagmi'
import { optimismGoerli, optimism } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { injectedWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { VITE_ALCHEMY_KEY, VITE_WALLETCONNECT_ID } from './utils'
import { haiTheme } from './utils/rainbowTheme'

const projectId = VITE_WALLETCONNECT_ID!

const { chains, publicClient } = configureChains(
    // temporary
    [optimismGoerli /* optimism */],
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

ReactDOM.render(
    <React.StrictMode>
        <WagmiConfig config={wagmiConfig}>
            <RainbowKitProvider theme={haiTheme} chains={chains}>
                <HelmetProvider>
                    <HashRouter>
                        <StoreProvider store={store}>
                            <App />
                        </StoreProvider>
                    </HashRouter>
                </HelmetProvider>
            </RainbowKitProvider>
        </WagmiConfig>
    </React.StrictMode>,
    document.getElementById('root')
)

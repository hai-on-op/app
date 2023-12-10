import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { StoreProvider } from 'easy-peasy'
import { configureChains, createConfig, WagmiConfig } from 'wagmi'
import { optimismGoerli } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { injectedWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import '@rainbow-me/rainbowkit/styles.css'

import { VITE_ALCHEMY_KEY, VITE_WALLETCONNECT_ID } from '~/utils'
import store from '~/store'
import { HaiThemeProvider } from '~/providers/HaiThemeProvider'

import { haiTheme } from '~/styles/themes'
import App from '~/App'
import { CustomAvatar } from '~/components/CustomAvatar'

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
        <HaiThemeProvider>
            <WagmiConfig config={wagmiConfig}>
                <RainbowKitProvider
                    avatar={CustomAvatar}
                    theme={haiTheme}
                    chains={chains}>
                    <HelmetProvider>
                        <BrowserRouter>
                            <StoreProvider store={store}>
                                <App />
                            </StoreProvider>
                        </BrowserRouter>
                    </HelmetProvider>
                </RainbowKitProvider>
            </WagmiConfig>
        </HaiThemeProvider>
    </React.StrictMode>,
    document.getElementById('root')
)

import { Suspense } from 'react'
import type { AppProps } from 'next/app'
import i18next from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { ThemeProvider } from 'styled-components'
import { StoreProvider } from 'easy-peasy'

import { useStore } from '@/store'

import { GlobalStyle } from '@/styles'
import { darkTheme } from '@/utils'

import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { configureChains, createConfig, WagmiConfig } from 'wagmi'
import { optimismGoerli } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { injectedWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { ALCHEMY_KEY, WALLETCONNECT_ID } from '@/utils'
import { haiTheme } from '@/utils/themes/rainbowTheme'

import ErrorBoundary from '@/components/ErrorBoundary'
import Shared from '@/containers/Shared'

const projectId = WALLETCONNECT_ID

const { chains, publicClient } = configureChains(
    [optimismGoerli],
    [alchemyProvider({ apiKey: ALCHEMY_KEY }), publicProvider()]
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

export default function App({ Component, pageProps }: AppProps) {
    const store = useStore()
    return (
        <WagmiConfig config={wagmiConfig}>
            <RainbowKitProvider theme={haiTheme} chains={chains}>
                <StoreProvider store={store}>
                    <I18nextProvider i18n={i18next}>
                        <ThemeProvider theme={darkTheme}>
                            <GlobalStyle bodyOverflow={store.getState().settingsModel.bodyOverflow}/>
                            <ErrorBoundary>
                                <Shared>
                                    <Suspense fallback={null}>
                                        <Component {...pageProps} />
                                    </Suspense>
                                </Shared>
                            </ErrorBoundary>
                        </ThemeProvider>
                    </I18nextProvider>
                </StoreProvider>
            </RainbowKitProvider>
        </WagmiConfig>
    )
}

import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { StoreProvider } from 'easy-peasy'
import { Analytics } from '@vercel/analytics/react'
import { WagmiConfig } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

import { chains, wagmiConfig } from './utils/wallet'
import { store } from '~/store'
import { HaiThemeProvider } from '~/providers/HaiThemeProvider'

import { haiTheme } from '~/styles/themes'
import App from '~/App'
import { CustomAvatar } from '~/components/CustomAvatar'

ReactDOM.render(
    <React.StrictMode>
        <Analytics />
        <HaiThemeProvider>
            <WagmiConfig config={wagmiConfig}>
                <RainbowKitProvider avatar={CustomAvatar} theme={haiTheme} chains={chains}>
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

import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { StoreProvider } from 'easy-peasy'
import { Analytics } from '@vercel/analytics/react'
import { WagmiConfig } from 'wagmi'

import { wagmiConfig } from './utils/wallet'
import { store } from '~/store'
import { HaiThemeProvider } from '~/providers/HaiThemeProvider'

import App from '~/App'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            cacheTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
        mutations: {
            retry: 0,
        },
    },
})

ReactDOM.render(
    <React.StrictMode>
        <Analytics />
        <HaiThemeProvider>
            <WagmiConfig config={wagmiConfig}>
                <HelmetProvider>
                    <BrowserRouter>
                        <QueryClientProvider client={queryClient}>
                            <StoreProvider store={store}>
                                <App />
                            </StoreProvider>
                        </QueryClientProvider>
                    </BrowserRouter>
                </HelmetProvider>
            </WagmiConfig>
        </HaiThemeProvider>
    </React.StrictMode>,
    document.getElementById('root')
)

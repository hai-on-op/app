import React, { PropsWithChildren } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiConfig, configureChains, createConfig } from 'wagmi'
import { optimism } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { StoreProvider } from 'easy-peasy'
import { store } from '~/store'
import { ThemeProvider } from 'styled-components'
import { darkTheme } from '~/styles/themes'


export function createTestQueryClient() {
    const client = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                refetchOnWindowFocus: false,
                cacheTime: Infinity,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    })
    return client
}

export function renderWithProviders(ui: React.ReactElement, client = createTestQueryClient()) {
    const { publicClient } = configureChains([optimism], [publicProvider()])
    const testWagmiConfig = createConfig({ autoConnect: false, connectors: [], publicClient })
    // Polyfill matchMedia for components using useMediaQuery
    if (!(global as any).window.matchMedia) {
        (global as any).window.matchMedia = () => ({
            matches: false,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
            media: '',
            onchange: null,
        })
    }
    const Wrapper: React.FC<PropsWithChildren<{}>> = ({ children }) => (
        <StoreProvider store={store}>
            <ThemeProvider theme={darkTheme}>
                <QueryClientProvider client={client}>
                    <WagmiConfig config={testWagmiConfig}>{children}</WagmiConfig>
                </QueryClientProvider>
            </ThemeProvider>
        </StoreProvider>
    )
    return {
        client,
        ...render(ui, { wrapper: Wrapper }),
    }
}



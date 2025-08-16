import React, { PropsWithChildren, createContext, useContext } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiConfig } from 'wagmi'
import { wagmiConfig } from '~/utils/wallet'

// Lightweight mock store context to satisfy useStoreState/useStoreActions if needed
const DummyStoreContext = createContext<any>({})
export const useDummyStore = () => useContext(DummyStoreContext)

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
    const Wrapper: React.FC<PropsWithChildren<{}>> = ({ children }) => (
        <DummyStoreContext.Provider value={{}}>
            <QueryClientProvider client={client}>
                <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>
            </QueryClientProvider>
        </DummyStoreContext.Provider>
    )
    return {
        client,
        ...render(ui, { wrapper: Wrapper }),
    }
}



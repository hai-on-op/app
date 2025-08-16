import React, { PropsWithChildren } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    return {
        client,
        ...render(ui, { wrapper: Wrapper }),
    }
}



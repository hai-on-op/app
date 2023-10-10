import { Suspense } from 'react'
import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import i18next from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { ThemeProvider } from 'styled-components'
import { Web3ReactProvider } from '@web3-react/core'
import { StoreProvider } from 'easy-peasy'

import { useStore } from '@/store'

import { GlobalStyle } from '@/styles'
import { darkTheme } from '@/utils'
import getLibrary from '@/utils/getLibrary'

import ErrorBoundary from '@/components/ErrorBoundary'
import Web3ReactManager from '@/components/Web3ReactManager'
import Shared from '@/containers/Shared'

const Web3ReactNetworkProvider = dynamic(
    import('@/components/Web3ReactManager/Web3ReactProviderSSR'),
    { ssr: false }
)

export default function App({ Component, pageProps }: AppProps) {
    const store = useStore()
    return (
        <Web3ReactProvider getLibrary={getLibrary}>
            <Web3ReactNetworkProvider getLibrary={getLibrary}>
                <StoreProvider store={store}>
                    <I18nextProvider i18n={i18next}>
                        <ThemeProvider theme={darkTheme}>
                            <GlobalStyle bodyOverflow={store.getState().settingsModel.bodyOverflow}/>
                            <ErrorBoundary>
                                <Shared>
                                    <Suspense fallback={null}>
                                        <Web3ReactManager>
                                            <Component {...pageProps} />
                                        </Web3ReactManager>
                                    </Suspense>
                                </Shared>
                            </ErrorBoundary>
                        </ThemeProvider>
                    </I18nextProvider>
                </StoreProvider>
            </Web3ReactNetworkProvider>
        </Web3ReactProvider>
    )
}

import { Suspense } from 'react'
import { Redirect, Route, Switch } from 'react-router-dom'
import i18next from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { ApolloProvider } from '@apollo/client'

import type { Theme } from '~/types'
import { client } from '~/utils'
import { useStoreState } from '~/store'
import { AnalyticsProvider } from '~/providers/AnalyticsProvider'

import { GlobalStyle } from '~/styles'
import ErrorBoundary from '~/ErrorBoundary'
import Shared from '~/containers/Shared'

import Splash from '~/containers/Splash'
import Privacy from '~/containers/Privacy'
import { Auctions } from '~/containers/Auctions'
import { Analytics } from '~/containers/Analytics'
import { Earn } from '~/containers/Earn'
import { Vaults } from '~/containers/Vaults'

declare module 'styled-components' {
    export interface DefaultTheme extends Theme {}
}

const App = () => {
    const { settingsModel: settingsState } = useStoreState((state) => state)

    const { bodyOverflow } = settingsState

    return (
        <I18nextProvider i18n={i18next}>
            <GlobalStyle bodyOverflow={bodyOverflow} />
            <ErrorBoundary>
                <ApolloProvider client={client}>
                    <AnalyticsProvider>
                        <Shared>
                            <Suspense fallback={null}>
                                <Route />
                                <>
                                    <Switch>
                                        <Route exact strict component={Splash} path={'/'} />
                                        <Route exact strict component={Privacy} path={'/privacy'} />
                                        <Route exact strict component={Auctions} path={'/auctions'} />
                                        <Route exact strict component={Analytics} path={'/analytics'} />
                                        <Route exact strict component={Earn} path={'/earn'}/>
                                        <Route exact strict component={Vaults} path={'/vaults/create'} />
                                        <Route exact component={Vaults} path={'/vaults/:id'} />
                                        <Route exact strict component={Vaults} path={'/vaults'} />
                                        <Route exact strict component={Vaults} path={'/:address'} />

                                        <Redirect from="*" to="/" />
                                    </Switch>
                                </>
                            </Suspense>
                        </Shared>
                    </AnalyticsProvider>
                </ApolloProvider>
            </ErrorBoundary>
        </I18nextProvider>
    )
}

export default App

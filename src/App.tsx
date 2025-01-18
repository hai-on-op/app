import { Suspense } from 'react'
import { Redirect, Route, Switch } from 'react-router-dom'
import i18next from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { ApolloProvider } from '@apollo/client'

import type { Theme } from '~/types'
import { ChainId, NETWORK_ID, client, VITE_FLAGSMITH_API_KEY } from '~/utils'
import { VelodromePriceProvider } from './providers/VelodromePriceProvider'
import { AnalyticsProvider } from '~/providers/AnalyticsProvider'
import { EffectsProvider } from './providers/EffectsProvider'
import { ClaimsProvider } from './providers/ClaimsProvider'

import { GlobalStyle } from '~/styles'
import { ErrorBoundary } from '~/ErrorBoundary'
import { Shared } from '~/containers/Shared'
import { Splash } from '~/containers/Splash'
import { Auctions } from '~/containers/Auctions'
import { Analytics } from '~/containers/Analytics'
import { Earn } from '~/containers/Earn'
import { Vaults } from '~/containers/Vaults'
import { Contracts } from '~/containers/Contracts'
import { Learn } from './containers/Learn'
import { VaultExplorer } from './containers/Vaults/Explore'
import { TestClaim } from './containers/TestClaim'
import { TestClaimVelo } from './containers/TestClaimVelo'
import flagsmith from 'flagsmith'
import { FlagsmithProvider } from 'flagsmith/react'

declare module 'styled-components' {
    export interface DefaultTheme extends Theme {}
}

const App = () => {
    return (
        <FlagsmithProvider
            options={{
                environmentID: VITE_FLAGSMITH_API_KEY,
            }}
            flagsmith={flagsmith}
        >
            <I18nextProvider i18n={i18next}>
                <GlobalStyle />
                <ErrorBoundary>
                    <ApolloProvider client={client}>
                        <VelodromePriceProvider>
                            <AnalyticsProvider>
                                <EffectsProvider>
                                    <ClaimsProvider>
                                        <Shared>
                                            <Suspense fallback={null}>
                                                <Route />
                                                <>
                                                    <Switch>
                                                        {NETWORK_ID === ChainId.OPTIMISM_SEPOLIA && (
                                                            <Route
                                                                exact
                                                                strict
                                                                component={TestClaim}
                                                                path={'/test/claim'}
                                                            />
                                                        )}
                                                        {NETWORK_ID === ChainId.OPTIMISM_SEPOLIA && (
                                                            <Route
                                                                exact
                                                                strict
                                                                component={TestClaimVelo}
                                                                path={'/test/claim-velo'}
                                                            />
                                                        )}
                                                        <Route exact strict component={Splash} path={'/'} />
                                                        <Route exact strict component={Auctions} path={'/auctions'} />
                                                        <Route exact strict component={Analytics} path={'/analytics'} />
                                                        <Route exact strict component={Contracts} path={'/contracts'} />
                                                        <Route exact strict component={Learn} path={'/learn'} />
                                                        <Route exact strict component={Earn} path={'/earn'} />
                                                        <Route
                                                            exact
                                                            strict
                                                            component={VaultExplorer}
                                                            path={'/vaults/explore'}
                                                        />
                                                        <Route
                                                            exact
                                                            strict
                                                            component={Vaults}
                                                            path={'/vaults/manage'}
                                                        />
                                                        <Route exact strict component={Vaults} path={'/vaults/open'} />
                                                        <Route exact component={Vaults} path={'/vaults/:idOrOwner'} />
                                                        <Route exact strict component={Vaults} path={'/vaults'} />

                                                        <Redirect from="*" to="/" />
                                                    </Switch>
                                                </>
                                            </Suspense>
                                        </Shared>
                                    </ClaimsProvider>
                                </EffectsProvider>
                            </AnalyticsProvider>
                        </VelodromePriceProvider>
                    </ApolloProvider>
                </ErrorBoundary>
            </I18nextProvider>
        </FlagsmithProvider>
    )
}

export default App

import { Suspense, lazy } from 'react'
import { Redirect, Route, Switch } from 'react-router-dom'
import i18next from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { ApolloProvider } from '@apollo/client'

import type { Theme } from '~/types'
import { ChainId, NETWORK_ID, client, VITE_FLAGSMITH_API_KEY } from '~/utils'
import { AnalyticsDetailsProvider, AnalyticsProvider } from '~/providers/AnalyticsProvider'
import { EffectsProvider } from './providers/EffectsProvider'
import { ClaimsProvider } from './providers/ClaimsProvider'
import { StakingProvider } from './providers/StakingProvider'

import { GlobalStyle } from '~/styles'
import { ErrorBoundary } from '~/ErrorBoundary'
import { Shared } from '~/containers/Shared'
import flagsmith from 'flagsmith'
import { FlagsmithProvider } from 'flagsmith/react'

const Splash = lazy(() => import('~/containers/Splash').then((module) => ({ default: module.Splash })))
const Auctions = lazy(() => import('~/containers/Auctions').then((module) => ({ default: module.Auctions })))
const Analytics = lazy(() => import('~/containers/Analytics').then((module) => ({ default: module.Analytics })))
const Earn = lazy(() => import('~/containers/Earn').then((module) => ({ default: module.Earn })))
const Vaults = lazy(() => import('~/containers/Vaults').then((module) => ({ default: module.Vaults })))
const Contracts = lazy(() => import('~/containers/Contracts').then((module) => ({ default: module.Contracts })))
const Learn = lazy(() => import('./containers/Learn').then((module) => ({ default: module.Learn })))
const VaultExplorer = lazy(() =>
    import('./containers/Vaults/Explore').then((module) => ({ default: module.VaultExplorer }))
)
const HaiVeloPage = lazy(() => import('./containers/HaiVeloPage').then((module) => ({ default: module.HaiVeloPage })))
const HaiAeroPage = lazy(() => import('./containers/MinterPage').then((module) => ({ default: module.HaiAeroPage })))
const TestClaim = lazy(() => import('./containers/TestClaim').then((module) => ({ default: module.TestClaim })))
const KiteStakePage = lazy(() => import('./containers/Stake/KiteStakePage'))
const HaiVeloVeloLpStakePage = lazy(() => import('./containers/Stake/HaiVeloVeloLpStakePage'))
const HaiBoldCurveLpStakePage = lazy(() => import('./containers/Stake/HaiBoldCurveLpStakePage'))
const TestClaimVelo = lazy(() =>
    import('./containers/TestClaimVelo').then((module) => ({ default: module.TestClaimVelo }))
)

function AnalyticsRoute() {
    return (
        <AnalyticsDetailsProvider>
            <Analytics />
        </AnalyticsDetailsProvider>
    )
}

function AuctionsRoute() {
    return (
        <ClaimsProvider>
            <Auctions />
        </ClaimsProvider>
    )
}

function EarnRoute() {
    return <Earn />
}

function VaultsRoute() {
    return (
        <StakingProvider>
            <Vaults />
        </StakingProvider>
    )
}

function HaiVeloRoute() {
    return (
        <StakingProvider>
            <ClaimsProvider>
                <HaiVeloPage />
            </ClaimsProvider>
        </StakingProvider>
    )
}

function HaiAeroRoute() {
    return (
        <StakingProvider>
            <ClaimsProvider>
                <HaiAeroPage />
            </ClaimsProvider>
        </StakingProvider>
    )
}

function KiteStakeRoute() {
    return (
        <StakingProvider>
            <KiteStakePage />
        </StakingProvider>
    )
}

function HaiVeloVeloLpStakeRoute() {
    return (
        <StakingProvider>
            <HaiVeloVeloLpStakePage />
        </StakingProvider>
    )
}

function HaiBoldCurveLpStakeRoute() {
    return (
        <StakingProvider>
            <HaiBoldCurveLpStakePage />
        </StakingProvider>
    )
}

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
                        <AnalyticsProvider>
                            <EffectsProvider>
                                <Shared>
                                    <Suspense fallback={null}>
                                        <Route />
                                        <>
                                            <Switch>
                                                {NETWORK_ID === ChainId.OPTIMISM_SEPOLIA && (
                                                    <Route exact strict component={TestClaim} path={'/test/claim'} />
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
                                                <Route exact strict component={AuctionsRoute} path={'/auctions'} />
                                                <Route
                                                    exact
                                                    strict
                                                    component={AnalyticsRoute}
                                                    path={'/analytics'}
                                                />
                                                <Route exact strict component={Contracts} path={'/contracts'} />
                                                <Route exact strict component={Learn} path={'/learn'} />
                                                <Route exact strict component={KiteStakeRoute} path={'/stake'} />
                                                <Route
                                                    exact
                                                    strict
                                                    component={HaiVeloVeloLpStakeRoute}
                                                    path={'/stake/hai-velo-velo-lp'}
                                                />
                                                <Route
                                                    exact
                                                    strict
                                                    component={HaiBoldCurveLpStakeRoute}
                                                    path={'/stake/hai-bold-curve-lp'}
                                                />
                                                <Route exact strict component={EarnRoute} path={'/earn'} />
                                                <Route
                                                    exact
                                                    strict
                                                    component={VaultExplorer}
                                                    path={'/vaults/explore'}
                                                />
                                                <Route exact strict component={VaultsRoute} path={'/vaults/manage'} />
                                                <Route exact strict component={VaultsRoute} path={'/vaults/open'} />
                                                <Route exact strict component={HaiVeloRoute} path={'/haiVELO'} />
                                                <Route exact strict component={HaiAeroRoute} path={'/haiAERO'} />
                                                <Route exact component={VaultsRoute} path={'/vaults/:idOrOwner'} />
                                                <Route exact strict component={VaultsRoute} path={'/vaults'} />

                                                <Redirect from="*" to="/" />
                                            </Switch>
                                        </>
                                    </Suspense>
                                </Shared>
                            </EffectsProvider>
                        </AnalyticsProvider>
                    </ApolloProvider>
                </ErrorBoundary>
            </I18nextProvider>
        </FlagsmithProvider>
    )
}

export default App

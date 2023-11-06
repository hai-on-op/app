import i18next from 'i18next'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { Redirect, Route, Switch } from 'react-router-dom'
import ErrorBoundary from '~/ErrorBoundary'
// import Safes from '~/containers/Safes'
// import SafeDetails from '~/containers/Safes/SafeDetails'
import Shared from '~/containers/Shared'
import { useStoreState } from '~/store'
import { type Theme } from '~/utils/interfaces'

import Splash from '~/containers/Splash'
import Privacy from '~/containers/Privacy'
// import CreateSafe from '~/containers/Safes/CreateSafe'
// import Auctions from '~/containers/Auctions'
// import Analytics from '~/containers/Analytics'
import { GlobalStyle } from '~/styles'
import { HaiThemeProvider } from '~/styles/HaiThemeProvider'

declare module 'styled-components' {
    export interface DefaultTheme extends Theme {}
}

const App = () => {
    const { settingsModel: settingsState } = useStoreState((state) => state)

    const { bodyOverflow } = settingsState

    return (
        <I18nextProvider i18n={i18next}>
            <HaiThemeProvider>
                <GlobalStyle bodyOverflow={bodyOverflow} />
                <ErrorBoundary>
                    <Shared>
                        <Suspense fallback={null}>
                            <Route />
                            <>
                                <Switch>
                                    <Route exact strict component={Splash} path={'/'} />
                                    <Route exact strict component={Privacy} path={'/privacy'} />
                                    {/* <Route exact strict component={Auctions} path={'/auctions'} />
                                    <Route exact strict component={Analytics} path={'/analytics'} />
                                    <Route exact strict component={CreateSafe} path={'/safes/create'} />
                                    <Route exact strict component={SafeDetails} path={'/safes/:id/deposit'} />
                                    <Route exact strict component={SafeDetails} path={'/safes/:id/withdraw'} />
                                    <Route exact component={SafeDetails} path={'/safes/:id'} />
                                    <Route exact strict component={Safes} path={'/safes'} />
                                    <Route exact strict component={Safes} path={'/:address'} /> */}

                                    <Redirect from="*" to="/" />
                                </Switch>
                            </>
                        </Suspense>
                    </Shared>
                </ErrorBoundary>
            </HaiThemeProvider>
        </I18nextProvider>
    )
}

export default App

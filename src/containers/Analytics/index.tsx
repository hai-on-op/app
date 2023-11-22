import { AnalyticsProvider } from './AnalyticsProvider'
import { CollateralTable } from './CollateralTable'
import { Numbers } from './Numbers'

export function Analytics() {
    return (
        <AnalyticsProvider>
            <Numbers/>
            <CollateralTable/>
        </AnalyticsProvider>
    )
}

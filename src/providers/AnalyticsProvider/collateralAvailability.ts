import { getTokenList } from '@hai-on-op/sdk'
import { DEPRECATED_COLLATERALS, NETWORK_NAME } from '~/utils/constants'
import type { TokenAnalyticsData } from '~/types'
import type { QueryCollateralType } from '~/utils/graphql/types'

export function getCollateralAvailability(
    onchain: Pick<TokenAnalyticsData, 'symbol' | 'debtCeiling'>[] = [],
    indexed: Pick<QueryCollateralType, 'id' | 'debtCeiling'>[] = []
) {
    // The SDK reports WADs and the subgraph reports decimal HAI. Only the zero/nonzero distinction matters here.
    const ceilings = new Map<string, boolean>()
    function record(symbol: string, ceiling: string | undefined) {
        if (ceiling && Number.isFinite(Number(ceiling))) ceilings.set(symbol.toUpperCase(), Number(ceiling) > 0)
    }
    for (const { id, debtCeiling } of indexed) record(id, debtCeiling)
    for (const { symbol, debtCeiling } of onchain) record(symbol, debtCeiling?.toString())

    const tokens = getTokenList(NETWORK_NAME)
    function hasCollateralDebtCeiling(symbol: string) {
        const key = symbol.toUpperCase()
        return ceilings.get(key) ?? !DEPRECATED_COLLATERALS.includes(key)
    }
    function isOpenableCollateral(symbol: string) {
        const key = symbol.toUpperCase()
        // The app routes new haiVELO vaults to v2 even while v1 still has a positive ceiling.
        return !!tokens[key]?.isCollateral && key !== 'HAIVELO' && hasCollateralDebtCeiling(key)
    }
    return { hasCollateralDebtCeiling, isOpenableCollateral }
}

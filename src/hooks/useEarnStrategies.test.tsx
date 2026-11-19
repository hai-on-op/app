import { act, renderHook } from '@testing-library/react-hooks'
import { describe, expect, it, vi } from 'vitest'

import { useEarnStrategies } from './useEarnStrategies'

const markets = {
    collateralTypesData: {
        collateralTypes: [
            { id: 'HAIAERO', debtAmount: '100' },
            { id: 'HAIVELOV2', debtAmount: '200' },
        ],
    },
    strategyData: { kiteStaking: { userPosition: 100, apr: 6 } },
    userPositionsList: [{ collateralName: 'HAIAERO', totalDebt: '10' }],
    coreDataLoaded: true,
    storeDataLoaded: true,
}
const boosts = { individualVaultBoosts: { HAIAERO: { baseAPR: 10, myBoostedAPR: 20, myBoost: 2 } }, loading: false }
const isOpenableCollateral = (symbol: string) => symbol === 'HAIVELOV2'

vi.mock('./useEarnData', () => ({ useEarnData: () => markets }))
vi.mock('./useBoost', () => ({ useBoost: () => boosts }))
vi.mock('~/providers/AnalyticsProvider', () => ({ useAnalytics: () => ({ isOpenableCollateral }) }))
vi.mock('~/providers/ClaimsProvider', () => ({ useClaims: () => ({}) }))
vi.mock('~/providers/VelodromePriceProvider', () => ({ useVelodromePrices: () => ({}) }))
vi.mock('~/store', () => ({ useStoreState: () => ({ vaultModel: {} }) }))
vi.mock('./useHaiMarketPrice', () => ({ useHaiMarketPrice: () => ({ priceUsd: 1 }) }))
vi.mock('./useUnderlyingAPR', () => ({ useUnderlyingAPRWithStrategyData: () => ({}) }))

describe('Earn collateral discovery', () => {
    it('reports a finite zero campaign APR when all holdings are outside the campaign', () => {
        const previousPositions = markets.userPositionsList
        try {
            markets.userPositionsList = []
            const { result } = renderHook(() => useEarnStrategies())
            expect(result.current.totalBoostablePosition).toBe(0)
            expect(result.current.averageAPR).toEqual({ averageWeightedAPR: 0, averageWeightedBoostedAPR: 0 })
        } finally {
            markets.userPositionsList = previousPositions
        }
    })

    it('lists open borrow markets and routes existing positions to My Vaults', () => {
        const { result } = renderHook(() => useEarnStrategies())

        const borrowRows = () => result.current.rows.filter((row) => row.strategyType === 'borrow')
        expect(borrowRows().map((row) => row.earnLink)).toEqual(['/vaults/open?collateral=HAIVELOV2'])
        expect(result.current.rows.filter((row) => row.strategyType === 'deposit').map((row) => row.earnLink)).toEqual(
            expect.arrayContaining(['/haiVELO', '/haiAERO'])
        )

        expect(result.current.totalBoostablePosition).toBe(10)
        expect(result.current.averageAPR).toEqual({ averageWeightedAPR: 10, averageWeightedBoostedAPR: 20 })

        act(() => result.current.setFilterEmpty(true))
        expect(borrowRows()).toHaveLength(1)
        expect(borrowRows()[0]).toMatchObject({ collateral: 'HAIAERO', userPosition: 10, earnLink: '/vaults?tab=user' })
    })
})

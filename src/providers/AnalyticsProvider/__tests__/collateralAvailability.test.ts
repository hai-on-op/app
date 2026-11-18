import { describe, expect, it, vi } from 'vitest'
import { BigNumber } from 'ethers'
import { getCollateralAvailability } from '../collateralAvailability'

vi.mock('~/utils/constants', async () => ({
    ...(await vi.importActual<typeof import('~/utils/constants')>('~/utils/constants')),
    NETWORK_NAME: 'mainnet',
}))

describe('vault collateral availability', () => {
    it('uses known closures while data is loading and restricts new vaults to SDK collateral', () => {
        const { isOpenableCollateral } = getCollateralAvailability()
        expect(
            ['ALETH', 'YV-VELO-ALETH-WETH', 'SNX', 'WBTC', 'LUSD-A', 'LINK', 'APXETH', 'MOO-VELO-V2-OP-VELO'].some(
                isOpenableCollateral
            )
        ).toBe(false)
        expect(['HAI', 'unknown'].some(isOpenableCollateral)).toBe(false)
        expect(isOpenableCollateral('weth')).toBe(true)
    })

    it('uses the reported ceiling for each symbol, preferring on-chain values to indexed values', () => {
        const indexed = [
            { id: 'weth', debtCeiling: '100' },
            { id: 'OP', debtCeiling: '0.0' },
            { id: 'alETH', debtCeiling: '50.5' },
        ]
        const { isOpenableCollateral } = getCollateralAvailability(
            [{ symbol: 'WETH', debtCeiling: BigNumber.from(0) }],
            indexed
        )
        expect(isOpenableCollateral('WETH')).toBe(false)
        expect(isOpenableCollateral('OP')).toBe(false)
        expect(isOpenableCollateral('ALETH')).toBe(true)
    })

    it('keeps the haiVELO v1 app retirement separate from an on-chain borrowing closure', () => {
        const { isOpenableCollateral, hasCollateralDebtCeiling } = getCollateralAvailability(
            [],
            [{ id: 'HAIVELO', debtCeiling: '100000' }]
        )
        expect(isOpenableCollateral('HAIVELO')).toBe(false)
        expect(hasCollateralDebtCeiling('HAIVELO')).toBe(true)
        expect(isOpenableCollateral('HAIVELOV2')).toBe(true)
    })
})

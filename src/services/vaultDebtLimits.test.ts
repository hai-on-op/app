import { BigNumber } from 'ethers'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { describe, expect, it } from 'vitest'
import { VaultInfoError } from '~/utils/vaults'
import { type VaultDebtLimits, getBorrowLimitError, getGeneratedDebtWad, getMaxBorrowWad } from './vaultDebtLimits'

const wad = parseEther
const rad = (value: string) => parseUnits(value, 45)
const ray = parseUnits('1', 27)
const limits: VaultDebtLimits = {
    rateRay: ray.mul(2),
    safetyPriceRay: ray,
    globalDebtRad: rad('950'),
    globalCeilingRad: rad('1000'),
    collateralDebtWad: wad('475'),
    collateralCeilingRad: rad('1000'),
    debtFloorRad: rad('0'),
    safeDebtWad: wad('75'),
    safeCeilingWad: wad('100'),
    creditRad: rad('0'),
}

describe('borrowing limits after accruing the selected collateral fee', () => {
    it('allows exact equality at all three ceilings using normalized SAFE debt', () => {
        expect(getBorrowLimitError(wad('50'), limits)).toBeUndefined()
        expect(getMaxBorrowWad(wad('1000'), limits).eq(wad('50'))).toBe(true)
    })

    it.each([
        ['globalCeilingRad', rad('1000').sub(1), VaultInfoError.GLOBAL_DEBT_CEILING],
        ['collateralCeilingRad', rad('1000').sub(1), VaultInfoError.COLLATERAL_DEBT_CEILING],
        ['safeCeilingWad', wad('100').sub(1), VaultInfoError.INDIVIDUAL_DEBT_CEILING],
    ] as const)('enforces %s even one base unit below the boundary', (key, ceiling, error) => {
        const snapshot = { ...limits, [key]: ceiling }
        expect(getBorrowLimitError(wad('50'), snapshot)).toBe(error)
        const max = getMaxBorrowWad(wad('1000'), snapshot)
        expect(getBorrowLimitError(max, snapshot)).toBeUndefined()
        expect(getBorrowLimitError(max.add(1), snapshot)).toBe(error)
    })

    it('allows a withdrawal of existing internal HAI even above the debt ceilings', () => {
        const snapshot = { ...limits, creditRad: rad('5'), globalCeilingRad: rad('900') }
        expect(getMaxBorrowWad(wad('10'), snapshot).eq(wad('5'))).toBe(true)
        expect(getBorrowLimitError(wad('5'), snapshot)).toBeUndefined()
        expect(getBorrowLimitError(wad('5').add(1), snapshot)).toBe(VaultInfoError.GLOBAL_DEBT_CEILING)
    })

    it('matches the proxy rounding when credit makes the remainder exactly divisible by the rate', () => {
        const snapshot = { ...limits, creditRad: rad('1') }
        expect(getGeneratedDebtWad(wad('3'), snapshot).eq(wad('1').add(1))).toBe(true)
        expect(getMaxBorrowWad(wad('1000'), snapshot).eq(wad('51').sub(1))).toBe(true)
    })

    it('uses collateral after a withdrawal and never offers unavailable debt', () => {
        expect(getMaxBorrowWad(wad('160'), limits).eq(wad('10'))).toBe(true)
        expect(getMaxBorrowWad(wad('140'), limits).isZero()).toBe(true)
        expect(getGeneratedDebtWad(BigNumber.from(1), limits).eq(1)).toBe(true)
    })
})

import { renderHook } from '@testing-library/react-hooks'
import { expect, it, vi } from 'vitest'
import { parseUnits, parseEther } from 'ethers/lib/utils'
import type { VaultDebtLimits } from '~/services/vaultDebtLimits'

import { VaultAction, VaultInfoError } from '~/utils'
import type { Debt, FormState } from '~/types'
import { useVaultError } from './useVaultError'

vi.mock('wagmi', () => ({ useAccount: () => ({ address: 'owner' }) }))
vi.mock('~/hooks', () => ({ useProxyAddress: () => 'proxy' }))
vi.mock('~/providers/AnalyticsProvider', () => ({
    useAnalytics: () => ({ hasCollateralDebtCeiling: () => false, isOpenableCollateral: () => false }),
}))

const value = { raw: '100', formatted: '100' }
const balance = { ...value, e18: '100000000000000000000' }
const limits = {
    rateRay: parseUnits('1', 27),
    safetyPriceRay: parseUnits('2', 27),
    globalDebtRad: parseUnits('999', 45),
    globalCeilingRad: parseUnits('1000', 45),
    collateralDebtWad: parseEther('100'),
    collateralCeilingRad: parseUnits('400', 45),
    debtFloorRad: parseUnits('0', 45),
    safeDebtWad: parseEther('100'),
    safeCeilingWad: parseEther('200'),
    creditRad: parseUnits('0', 45),
}
function check(
    action: VaultAction,
    formState: FormState,
    isSafe = true,
    limits?: VaultDebtLimits,
    debtPreview?: Partial<Debt>
) {
    const { result } = renderHook(() =>
        useVaultError({
            action,
            formState,
            isSafe,
            limits,
            collateral: { name: 'ALETH', balance, total: { current: value, after: value } },
            debt: {
                priceInUSD: '1',
                balance,
                available: value,
                total: { current: value, after: value },
                ...debtPreview,
            },
        })
    )
    return result.current.error
}

it('blocks a new vault or more borrowing on a closed collateral', () => {
    expect(check(VaultAction.CREATE, { deposit: '1', borrow: '1' })).toBe(VaultInfoError.COLLATERAL_DEBT_CEILING)
    expect(check(VaultAction.WITHDRAW_BORROW, { borrow: '1' })).toBe(VaultInfoError.COLLATERAL_DEBT_CEILING)
})
it('permits deposits and repayments that improve an unsafe vault, and checks withdrawals for safety', () => {
    expect(check(VaultAction.DEPOSIT_BORROW, { deposit: '1' }, false)).toBeUndefined()
    expect(check(VaultAction.DEPOSIT_REPAY, { repay: '1' }, false)).toBeUndefined()
    expect(check(VaultAction.WITHDRAW_REPAY, { withdraw: '1' })).toBeUndefined()
    expect(check(VaultAction.WITHDRAW_REPAY, { withdraw: '1' }, false)).toBe(VaultInfoError.COLLATERAL_RATIO)
})

it('displays the specific debt ceiling for an existing vault and accepts a fully credited request', () => {
    expect(check(VaultAction.DEPOSIT_BORROW, { borrow: '2' }, true, limits)).toBe(VaultInfoError.GLOBAL_DEBT_CEILING)
    expect(
        check(VaultAction.DEPOSIT_BORROW, { borrow: '2' }, true, { ...limits, creditRad: parseUnits('2', 45) })
    ).toBeUndefined()
    const atFloor = { ...limits, debtFloorRad: parseUnits('101', 45) }
    expect(check(VaultAction.DEPOSIT_BORROW, { borrow: '1' }, true, atFloor)).toBeUndefined()
    expect(
        check(VaultAction.DEPOSIT_BORROW, { borrow: '1' }, true, {
            ...atFloor,
            debtFloorRad: atFloor.debtFloorRad.add(1),
        })
    ).toBe(VaultInfoError.DEBT_TOTAL)
})

it('validates a fully credited payoff with no wallet contribution and rejects an unavailable payoff', () => {
    const form = { repay: '0', repayAll: true }
    expect(
        check(VaultAction.DEPOSIT_REPAY, form, true, undefined, { payoff: { raw: '0', formatted: '0' }, afterRad: '0' })
    ).toBeUndefined()
    expect(check(VaultAction.WITHDRAW_REPAY, form)).toBe(VaultInfoError.INVALID_AMOUNT)
    expect(check(VaultAction.DEPOSIT_REPAY, { repay: '0' })).toBe(VaultInfoError.ZERO_AMOUNT)
})

it('validates a withdrawal without borrowing at the exact safety price boundary', () => {
    const form = { withdraw: '1' }
    const ceiling = parseEther(value.raw).mul(limits.safetyPriceRay)
    expect(check(VaultAction.WITHDRAW_BORROW, form, false, limits, { afterRad: ceiling.toString() })).toBeUndefined()
    expect(check(VaultAction.WITHDRAW_BORROW, form, true, limits, { afterRad: ceiling.add(1).toString() })).toBe(
        VaultInfoError.COLLATERAL_RATIO
    )
})

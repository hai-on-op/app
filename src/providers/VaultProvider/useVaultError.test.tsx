import { renderHook } from '@testing-library/react-hooks'
import { expect, it, vi } from 'vitest'

import { VaultAction, VaultInfoError } from '~/utils'
import type { FormState } from '~/types'
import { useVaultError } from './useVaultError'

vi.mock('wagmi', () => ({ useAccount: () => ({ address: 'owner' }) }))
vi.mock('~/hooks', () => ({ useProxyAddress: () => 'proxy' }))
vi.mock('~/providers/AnalyticsProvider', () => ({
    useAnalytics: () => ({ hasCollateralDebtCeiling: () => false, isOpenableCollateral: () => false }),
}))
vi.mock('~/store', () => ({ useStoreState: () => ({ liquidationData: { perVaultDebtCeiling: '0' } }) }))

const value = { raw: '100', formatted: '100' }
const balance = { ...value, e18: '100000000000000000000' }
function check(action: VaultAction, formState: FormState, isSafe = true) {
    const { result } = renderHook(() =>
        useVaultError({
            action,
            formState,
            collateralRatio: '90',
            isSafe,
            collateral: { name: 'ALETH', balance, total: { current: value, after: value } },
            debt: { priceInUSD: '1', balance, available: value, total: { current: value, after: value } },
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

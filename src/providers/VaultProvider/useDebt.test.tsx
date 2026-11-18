import { renderHook } from '@testing-library/react-hooks'
import { describe, expect, it, vi } from 'vitest'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import type { Collateral, FormState } from '~/types'
import type { VaultDebtLimits } from '~/services/vaultDebtLimits'
import { getWithdrawableCollateral, VaultAction } from '~/utils'
import { useDebt } from './useDebt'

vi.mock('~/store', () => ({
    useStoreState: () => ({ vaultModel: { singleVault: { debt: '100', collateral: '3' } }, connectWalletModel: {} }),
}))
vi.mock('~/hooks', () => ({ useBalance: () => ({}) }))

const collateral = {
    total: { after: { raw: '2' } },
    liquidationData: { accumulatedRate: '1', currentPrice: { safetyPrice: '100', liquidationPrice: '120' } },
} as Collateral

describe('vault amount previews', () => {
    it('retains residual debt for a partial repayment and clears only the full balance', () => {
        const { result, rerender } = renderHook(
            ({ repay }) => useDebt(VaultAction.WITHDRAW_REPAY, { repay }, collateral),
            { initialProps: { repay: '99.999999999999999999' } }
        )
        expect(result.current.total.after.raw).toBe('0.000000000000000001')
        rerender({ repay: '100' })
        expect(Number(result.current.total.after.raw)).toBe(0)
    })
    it('limits new borrowing to the collateral remaining after the requested withdrawal', () => {
        const { result } = renderHook(() => useDebt(VaultAction.WITHDRAW_BORROW, { withdraw: '1' }, collateral))
        expect(Number(result.current.available.raw)).toBe(100)
    })
    it('rounds required collateral up and caps withdrawals at the supported token precision', () => {
        const oneHaiRad = parseUnits('1', 45).toString()
        expect(getWithdrawableCollateral('1', oneHaiRad, '3', 18)).toBe('0.666666666666666666')
        expect(getWithdrawableCollateral('1', oneHaiRad, '3', 8)).toBe('0.66666666')
        expect(getWithdrawableCollateral('1', '1', '0.1', 18)).toBe('0.999999999999999999')
        expect(Number(getWithdrawableCollateral('2', parseUnits('300', 45).toString(), '100', 18))).toBe(0)
        expect(Number(getWithdrawableCollateral('2', '0', '0', 18))).toBe(2)
    })
})

const limits: VaultDebtLimits = {
    rateRay: parseUnits('1.25', 27),
    safetyPriceRay: parseUnits('100', 27),
    globalDebtRad: parseUnits('500', 45),
    globalCeilingRad: parseUnits('100000', 45),
    collateralDebtWad: parseEther('200'),
    collateralCeilingRad: parseUnits('10000', 45),
    debtFloorRad: parseUnits('1', 45),
    safeDebtWad: parseEther('100'),
    safeCeilingWad: parseEther('1000'),
    creditRad: parseUnits('0.75', 45),
    proxyCreditRad: parseUnits('10', 45),
}

describe('vault repayment previews with a SAFE snapshot', () => {
    it('uses handler credit only for a positive partial payment and cancels whole normalized debt wei', () => {
        const { result, rerender } = renderHook(
            ({ repay }) => useDebt(VaultAction.DEPOSIT_REPAY, { repay }, collateral, limits),
            { initialProps: { repay: '0' } }
        )
        expect(parseEther(result.current.total.after.raw)).toEqual(parseEther('125'))
        rerender({ repay: '24.249999999999999999' })
        expect(parseEther(result.current.total.after.raw)).toEqual(parseEther('100.000000000000000002'))
        rerender({ repay: '124.5' })
        expect(parseEther(result.current.total.after.raw)).toEqual(parseEther('0'))
    })

    it.each([
        { action: VaultAction.DEPOSIT_REPAY, withdraw: undefined, walletCost: '115' },
        { action: VaultAction.WITHDRAW_REPAY, withdraw: '0', walletCost: '115' },
        { action: VaultAction.WITHDRAW_REPAY, withdraw: '1', walletCost: '124.25' },
    ])(
        'quotes the credit source of the selected full-repay call ($walletCost HAI)',
        ({ action, withdraw, walletCost }) => {
            const { result } = renderHook(() => useDebt(action, { withdraw }, collateral, limits))
            expect(parseEther(result.current.payoff!.raw)).toEqual(parseEther(walletCost))
        }
    )

    it.each([undefined, '1'])('rounds the gross payoff up when a snapshot is unavailable (withdraw %s)', (withdraw) => {
        const unquoted = {
            ...collateral,
            liquidationData: { ...collateral.liquidationData!, accumulatedRate: '1.000000000000000000000000001' },
        }
        const { result } = renderHook(() => useDebt(VaultAction.WITHDRAW_REPAY, { withdraw }, unquoted))
        expect(parseEther(result.current.payoff!.raw)).toEqual(parseEther('100.000000000000000001'))
    })

    it('reprices an explicit full repayment after accrual while a manually entered payment stays fixed', () => {
        const form: FormState = { repay: '115', repayAll: true }
        const { result, rerender } = renderHook(
            ({ form, snapshot }) => useDebt(VaultAction.DEPOSIT_REPAY, form, collateral, snapshot),
            { initialProps: { form, snapshot: limits } }
        )
        const changed = { ...limits, rateRay: parseUnits('1.5', 27), creditRad: parseUnits('0.5', 45) }
        rerender({ form, snapshot: changed })
        expect(parseEther(result.current.payoff!.raw)).toEqual(parseEther('140'))
        expect(parseEther(result.current.total.after.raw)).toEqual(parseEther('0'))

        rerender({ form: { repay: '115' }, snapshot: changed })
        expect(parseEther(result.current.total.after.raw)).toEqual(parseEther('34.5'))
    })

    it('quotes zero when credit exactly covers the debt and omits a quote that would underflow on chain', () => {
        const { result, rerender } = renderHook(
            ({ proxyCreditRad }) => useDebt(VaultAction.DEPOSIT_REPAY, {}, collateral, { ...limits, proxyCreditRad }),
            { initialProps: { proxyCreditRad: parseUnits('125', 45) } }
        )
        expect(parseEther(result.current.payoff!.raw)).toEqual(parseEther('0'))
        rerender({ proxyCreditRad: parseUnits('125', 45).add(1) })
        expect(result.current.payoff).toBeUndefined()
    })
})

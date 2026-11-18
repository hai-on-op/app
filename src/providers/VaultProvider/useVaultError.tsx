import { BigNumber } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { utils as gebUtils } from '@hai-on-op/sdk'
import { useAccount } from 'wagmi'

import type { Collateral, Debt, FormState } from '~/types'
import { VaultAction, VaultInfoError, getVaultAmountError, formatNumber, toFixedString } from '~/utils'
import { type VaultDebtLimits, getBorrowLimitError, getGeneratedDebtWad } from '~/services/vaultDebtLimits'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useProxyAddress } from '~/hooks'

type Props = {
    action: VaultAction
    formState: FormState
    collateral: Collateral
    debt: Debt
    isSafe: boolean
    limits?: VaultDebtLimits
}
export function useVaultError({ action, formState, collateral, debt, isSafe, limits }: Props) {
    const { address: account } = useAccount()
    const proxyAddress = useProxyAddress()
    const { hasCollateralDebtCeiling, isOpenableCollateral } = useAnalytics()

    if (!account) return { error: VaultInfoError.NO_WALLET }
    if (!proxyAddress) return { error: VaultInfoError.NO_PROXY }

    const amountError = getVaultAmountError(action, formState, collateral.data?.decimals)
    if (amountError) return { error: VaultInfoError.INVALID_AMOUNT, errorMessage: amountError }

    const availableCollateralBN = BigNumber.from(toFixedString(collateral.total.current?.raw || '0', 'WAD'))
    const collateralBalanceBN = BigNumber.from(toFixedString(collateral.balance.raw, 'WAD'))
    const totalHaiBN = BigNumber.from(toFixedString(debt.total.current?.raw || '0', 'WAD'))
    const availableHaiBN = BigNumber.from(toFixedString(debt.available.raw, 'WAD'))
    const haiBalanceBN = BigNumber.from(toFixedString(debt.balance.raw || '0', 'WAD'))

    const depositBN = BigNumber.from(toFixedString(formState.deposit || '0', 'WAD'))
    const withdrawBN = BigNumber.from(toFixedString(formState.withdraw || '0', 'WAD'))
    const borrowBN = BigNumber.from(toFixedString(formState.borrow || '0', 'WAD'))
    const repayBN = BigNumber.from(toFixedString(formState.repay || '0', 'WAD'))

    const repaying = action === VaultAction.DEPOSIT_REPAY || action === VaultAction.WITHDRAW_REPAY
    const fullPayoff = repaying && formState.repayAll === true
    if (fullPayoff && !debt.payoff) {
        return {
            error: VaultInfoError.INVALID_AMOUNT,
            errorMessage: 'The full payoff is unavailable for this vault. Enter a fixed repayment amount.',
        }
    }

    const { debtFloor, safetyCRatio } = collateral.liquidationData || {}

    const debtFloorRad = limits?.debtFloorRad ?? BigNumber.from(toFixedString(debtFloor || '0', 'RAD'))
    const totalDebtBN = BigNumber.from(toFixedString(debt.total.after.raw, 'WAD'))

    if (action === VaultAction.CREATE && !isOpenableCollateral(collateral.name)) {
        return {
            error: VaultInfoError.COLLATERAL_DEBT_CEILING,
            errorMessage: 'This collateral is closed to new vaults',
        }
    }
    const increasingDebt =
        borrowBN.gt(0) && [VaultAction.CREATE, VaultAction.DEPOSIT_BORROW, VaultAction.WITHDRAW_BORROW].includes(action)
    const withdrawing = withdrawBN.gt(0) && [VaultAction.WITHDRAW_BORROW, VaultAction.WITHDRAW_REPAY].includes(action)
    if (increasingDebt && !limits && !hasCollateralDebtCeiling(collateral.name)) {
        return {
            error: VaultInfoError.COLLATERAL_DEBT_CEILING,
            errorMessage: 'New borrowing is closed for this collateral',
        }
    }

    if (increasingDebt && limits) {
        const error = getBorrowLimitError(borrowBN, limits)
        if (error !== undefined) return { error }
    }

    switch (action) {
        case VaultAction.CREATE:
        case VaultAction.DEPOSIT_BORROW: {
            if (depositBN.isZero() && borrowBN.isZero()) {
                return { error: VaultInfoError.ZERO_AMOUNT }
            }
            if (depositBN.gt(collateralBalanceBN)) {
                return { error: VaultInfoError.INSUFFICIENT_COLLATERAL }
            }
            if (borrowBN.gt(availableHaiBN)) {
                return {
                    error: VaultInfoError.COLLATERAL_RATIO,
                    errorMessage: `Too much debt, which would bring vault below ${
                        Number(safetyCRatio) * 100
                    }% collateralization ratio`,
                }
            }
            break
        }
        case VaultAction.DEPOSIT_REPAY: {
            if (depositBN.isZero() && repayBN.isZero() && !fullPayoff) {
                return { error: VaultInfoError.ZERO_AMOUNT }
            }
            if (depositBN.gt(collateralBalanceBN)) {
                return { error: VaultInfoError.INSUFFICIENT_COLLATERAL }
            }
            if (repayBN.gt(totalHaiBN)) {
                return { error: VaultInfoError.REPAY_EXCEEDS_OWED }
            }
            if (!repayBN.isZero() && repayBN.gt(haiBalanceBN)) {
                return { error: VaultInfoError.INSUFFICIENT_HAI }
            }
            break
        }
        case VaultAction.WITHDRAW_BORROW: {
            if (withdrawBN.isZero() && borrowBN.isZero()) {
                return { error: VaultInfoError.ZERO_AMOUNT }
            }
            if (withdrawBN.gt(availableCollateralBN)) {
                return { error: VaultInfoError.WITHDRAW_EXCEEDS_COLLATERAL }
            }
            if (borrowBN.gt(availableHaiBN)) {
                return {
                    error: VaultInfoError.COLLATERAL_RATIO,
                    errorMessage: `Too much debt, which would bring vault below ${
                        Number(safetyCRatio) * 100
                    }% collateralization ratio`,
                }
            }
            break
        }
        case VaultAction.WITHDRAW_REPAY: {
            if (withdrawBN.isZero() && repayBN.isZero() && !fullPayoff) {
                return { error: VaultInfoError.ZERO_AMOUNT }
            }
            if (withdrawBN.gt(availableCollateralBN)) {
                return { error: VaultInfoError.WITHDRAW_EXCEEDS_COLLATERAL }
            }
            if (repayBN.gt(totalHaiBN)) {
                return { error: VaultInfoError.REPAY_EXCEEDS_OWED }
            }
            if (!repayBN.isZero() && repayBN.gt(haiBalanceBN)) {
                return { error: VaultInfoError.INSUFFICIENT_HAI }
            }
            break
        }
    }

    const generated = increasingDebt && limits ? getGeneratedDebtWad(borrowBN, limits) : undefined
    const issuedRad =
        debt.afterRad !== undefined
            ? BigNumber.from(debt.afterRad)
            : limits && generated
            ? limits.safeDebtWad.add(generated).mul(limits.rateRay)
            : totalDebtBN.mul(gebUtils.RAY)
    if (!issuedRad.isZero() && issuedRad.lt(debtFloorRad)) {
        return {
            error: VaultInfoError.DEBT_TOTAL,
            errorMessage: `The minimum amount of debt per vault is ${formatNumber(formatUnits(debtFloorRad, 45))} HAI`,
        }
    }
    const requiresSafeVault = withdrawing || (generated ? generated.gt(0) : increasingDebt)
    const safeAfter =
        limits && (generated || repaying)
            ? issuedRad.lte(BigNumber.from(toFixedString(collateral.total.after.raw, 'WAD')).mul(limits.safetyPriceRay))
            : isSafe
    if (requiresSafeVault && !safeAfter) {
        return {
            error: VaultInfoError.COLLATERAL_RATIO,
            errorMessage: `Too much debt, which would bring vault below ${
                Number(safetyCRatio) * 100
            }% collateralization ratio`,
        }
    }
    if (action === VaultAction.CREATE && (depositBN.isZero() || borrowBN.isZero())) {
        return { error: VaultInfoError.ZERO_AMOUNT }
    }

    return {}
}

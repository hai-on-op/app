import numeral from 'numeral'
import { BigNumber } from 'ethers'
import { useAccount } from 'wagmi'

import type { Collateral, Debt, FormState } from '~/types'
import { VaultAction, VaultInfoError, formatNumber, toFixedString } from '~/utils'
import { useStoreState } from '~/store'
import { useProxyAddress } from '~/hooks'

type Props = {
    action: VaultAction
    formState: FormState
    collateral: Collateral
    debt: Debt
    collateralRatio: string
    isSafe: boolean
}
export function useVaultError({ action, formState, collateral, debt, collateralRatio, isSafe }: Props) {
    const { address: account } = useAccount()
    const proxyAddress = useProxyAddress()
    const { liquidationData } = useStoreState(({ vaultModel }) => vaultModel)

    if (!account) return { error: VaultInfoError.NO_WALLET }
    if (!proxyAddress) return { error: VaultInfoError.NO_PROXY }

    const availableCollateralBN = BigNumber.from(toFixedString(collateral.total.current?.raw || '0', 'WAD'))
    const collateralBalanceBN = BigNumber.from(toFixedString(collateral.balance.raw, 'WAD'))
    const totalHaiBN = BigNumber.from(toFixedString(debt.total.current?.raw || '0', 'WAD'))
    const availableHaiBN = BigNumber.from(toFixedString(debt.available.raw, 'WAD'))
    const haiBalanceBN = BigNumber.from(toFixedString(debt.balance.raw || '0', 'WAD'))

    const depositBN = BigNumber.from(toFixedString(formState.deposit || '0', 'WAD'))
    const withdrawBN = BigNumber.from(toFixedString(formState.withdraw || '0', 'WAD'))
    const borrowBN = BigNumber.from(toFixedString(formState.borrow || '0', 'WAD'))
    const repayBN = BigNumber.from(toFixedString(formState.repay || '0', 'WAD'))

    const { globalDebtCeiling, perVaultDebtCeiling } = liquidationData || {}
    const { debtFloor, safetyCRatio } = collateral.liquidationData || {}

    const debtFloorBN = BigNumber.from(toFixedString(debtFloor || '0', 'WAD'))
    const totalDebtBN = BigNumber.from(toFixedString(debt.total.after.raw, 'WAD'))

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
            if (depositBN.isZero() && repayBN.isZero()) {
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
            if (withdrawBN.isZero() && repayBN.isZero()) {
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

    if (debtFloor && !totalDebtBN.isZero() && totalDebtBN.lt(debtFloorBN)) {
        const debtFloorFormatted = Math.ceil(Number(formatNumber(debtFloor)))
        return {
            error: VaultInfoError.DEBT_TOTAL,
            errorMessage: `The minimum amount of debt per vault is ${debtFloorFormatted} HAI`,
        }
    }
    if (!isSafe && Number(collateralRatio) >= 0) {
        return {
            error: VaultInfoError.COLLATERAL_RATIO,
            errorMessage: `Too much debt, which would bring vault below ${
                Number(safetyCRatio) * 100
            }% collateralization ratio`,
        }
    }
    if (numeral(debt).value() > numeral(globalDebtCeiling).value()) {
        return {
            error: VaultInfoError.GLOBAL_DEBT_CEILING,
            errorMessage: `Cannot exceed global debt ceiling (${globalDebtCeiling})`,
        }
    }
    if (numeral(debt).value() > numeral(perVaultDebtCeiling).value()) {
        return {
            error: VaultInfoError.HAI_DEBT_CEILING,
            errorMessage: `Cannot exceed per vault $HAI debt ceiling (${perVaultDebtCeiling})`,
        }
    }
    if (action === VaultAction.CREATE) {
        if (depositBN.isZero()) {
            return { error: VaultInfoError.ZERO_AMOUNT }
        }
        if (!borrowBN.isZero() && borrowBN.lt(debtFloorBN)) {
            return { error: VaultInfoError.MINIMUM_MINT }
        }
    } else if (perVaultDebtCeiling) {
        const perVaultDebtCeilingBN = BigNumber.from(toFixedString(perVaultDebtCeiling, 'WAD'))
        if (totalDebtBN.gte(perVaultDebtCeilingBN)) {
            return {
                error: VaultInfoError.INDIVIDUAL_DEBT_CEILING,
                errorMessage: `Individual safe can't have more than ${perVaultDebtCeiling} HAI of debt`,
            }
        }
    }

    return {}
}

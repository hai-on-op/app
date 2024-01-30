import numeral from 'numeral'
import { BigNumber } from 'ethers'
import { useAccount } from 'wagmi'

import type { Collateral, Debt } from '~/types'
import { VaultAction, VaultInfoError, formatNumber, toFixedString } from '~/utils'
import { useStoreState } from '~/store'
import { useProxyAddress } from '~/hooks'

type Props = {
    action: VaultAction
    collateral: Collateral
    debt: Debt
    collateralRatio: string
    isSafe: boolean
}
export function useVaultError({ action, collateral, debt, collateralRatio, isSafe }: Props) {
    const { address: account } = useAccount()
    const proxyAddress = useProxyAddress()
    const { liquidationData, vaultData } = useStoreState(({ vaultModel }) => vaultModel)

    if (!account) return { error: VaultInfoError.NO_WALLET }
    if (!proxyAddress) return { error: VaultInfoError.NO_PROXY }

    const availableCollateralBN = BigNumber.from(toFixedString(collateral.available, 'WAD'))
    const collateralBalanceBN = BigNumber.from(toFixedString(collateral.balance.raw, 'WAD'))
    const availableHaiBN = BigNumber.from(toFixedString(debt.available, 'WAD'))
    const haiBalanceBN = BigNumber.from(toFixedString(debt.balance.raw || '0', 'WAD'))

    const leftInputBN = BigNumber.from(toFixedString(vaultData.leftInput || '0', 'WAD'))
    const rightInputBN = BigNumber.from(toFixedString(vaultData.rightInput || '0', 'WAD'))

    const { globalDebtCeiling, perVaultDebtCeiling } = liquidationData || {}
    const { debtFloor, safetyCRatio } = collateral.liquidationData || {}

    const debtFloorBN = BigNumber.from(toFixedString(debtFloor || '0', 'WAD'))
    const totalDebtBN = BigNumber.from(toFixedString(debt.total, 'WAD'))

    if (action === VaultAction.DEPOSIT_BORROW || action === VaultAction.CREATE) {
        if (leftInputBN.isZero() && rightInputBN.isZero()) {
            return { error: VaultInfoError.ZERO_AMOUNT }
        }
        if (leftInputBN.gt(collateralBalanceBN)) {
            return { error: VaultInfoError.INSUFFICIENT_COLLATERAL }
        }
        if (rightInputBN.gt(availableHaiBN)) {
            return { error: VaultInfoError.INSUFFICIENT_HAI }
        }
    } else if (action === VaultAction.WITHDRAW_REPAY) {
        if (leftInputBN.isZero() && rightInputBN.isZero()) {
            return { error: VaultInfoError.ZERO_AMOUNT }
        }
        if (leftInputBN.gt(availableCollateralBN)) {
            return { error: VaultInfoError.WITHDRAW_EXCEEDS_COLLATERAL }
        }
        if (rightInputBN.gt(availableHaiBN)) {
            return { error: VaultInfoError.REPAY_EXCEEDS_OWED }
        }
        if (!rightInputBN.isZero() && rightInputBN.gt(haiBalanceBN)) {
            return { error: VaultInfoError.INSUFFICIENT_HAI }
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
        if (leftInputBN.isZero()) {
            return { error: VaultInfoError.ZERO_AMOUNT }
        }
        if (!rightInputBN.isZero() && rightInputBN.lt(1)) {
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

import numeral from 'numeral'
import { type TokenData, utils as gebUtils } from '@hai-on-op/sdk'
import { BigNumber } from 'ethers'

import type { ILiquidationData, ISafe, ISafeData } from '~/types'
import { Status } from './constants'
import { formatNumber, toFixedString } from './formatting'
import { returnTotalValue } from './math'

export enum VaultAction {
    DEPOSIT_BORROW,
    WITHDRAW_REPAY,
    CREATE,
    INFO
}

export enum VaultInfoError {
    NO_WALLET,
    NO_PROXY,
    INSUFFICIENT_COLLATERAL,
    INSUFFICIENT_HAI,
    WITHDRAW_EXCEEDS_COLLATERAL,
    REPAY_EXCEEDS_OWED,
    ZERO_AMOUNT,
    DEBT_TOTAL,
    COLLATERAL_RATIO,
    GLOBAL_DEBT_CEILING,
    HAI_DEBT_CEILING,
    INDIVIDUAL_DEBT_CEILING,
    MINIMUM_MINT
}
export const vaultInfoErrors: Record<number, string> = {
    [VaultInfoError.NO_WALLET]: `Connect a valid wallet to continue`,
    [VaultInfoError.NO_PROXY]: `Create a proxy contract to continue`,
    [VaultInfoError.INSUFFICIENT_COLLATERAL]: `Insufficient collateral balance`,
    [VaultInfoError.INSUFFICIENT_HAI]: `Insufficient $HAI balance`,
    [VaultInfoError.WITHDRAW_EXCEEDS_COLLATERAL]: `Withdraw amount cannot exceed collateral balance`,
    [VaultInfoError.REPAY_EXCEEDS_OWED]: `Repay amount cannot exceed $HAI debt balance`,
    [VaultInfoError.ZERO_AMOUNT]: `Please enter a non-zero amount of collateral and/or $HAI`,
    [VaultInfoError.GLOBAL_DEBT_CEILING]: `Cannot exceed global debt ceiling`,
    [VaultInfoError.HAI_DEBT_CEILING]: `Cannot exceed HAI debt ceiling`,
    [VaultInfoError.MINIMUM_MINT]: `You must mint at least 1 $HAI to create a Vault`,
}

export const DEFAULT_SAFE_STATE: ISafeData = {
    totalCollateral: '',
    totalDebt: '',
    leftInput: '',
    rightInput: '',
    collateralRatio: 0,
    liquidationPrice: 0,
    collateral: '',
}

export const formatUserSafe = (
    safes: Array<any>,
    liquidationData: ILiquidationData,
    tokensData: { [key: string]: TokenData }
): Array<ISafe> => {
    const collateralBytes32: { [key: string]: string } = Object.values(tokensData)
        .filter((token) => token.isCollateral)
        .reduce((accum, token) => {
            return { ...accum, [token.bytes32String]: token.symbol }
        }, {})

    const { currentRedemptionPrice, currentRedemptionRate, collateralLiquidationData } = liquidationData

    return safes
        .filter((s) => s.collateralType in collateralBytes32)
        .map((s) => {
            const token = collateralBytes32[s.collateralType]
            const accumulatedRate = collateralLiquidationData[token]?.accumulatedRate
            const currentPrice = collateralLiquidationData[token]?.currentPrice
            const liquidationCRatio = collateralLiquidationData[token]?.liquidationCRatio
            const safetyCRatio = collateralLiquidationData[token]?.safetyCRatio
            const liquidationPenalty = collateralLiquidationData[token]?.liquidationPenalty
            const totalAnnualizedStabilityFee = collateralLiquidationData[token]?.totalAnnualizedStabilityFee

            const availableDebt = returnAvaiableDebt(currentPrice?.safetyPrice, '0', s.collateral, s.debt)

            const totalDebt = returnTotalValue(returnTotalDebt(s.debt, accumulatedRate) as string, '0').toString()

            const liquidationPrice = getLiquidationPrice(
                s.collateral,
                totalDebt as string,
                liquidationCRatio,
                currentRedemptionPrice
            )

            const collateralRatio = getCollateralRatio(
                s.collateral,
                totalDebt as string,
                currentPrice?.liquidationPrice,
                liquidationCRatio
            )

            return {
                id: s.safeId,
                safeHandler: s.safeHandler,
                date: s.createdAt,
                riskState: ratioChecker(Number(collateralRatio), Number(safetyCRatio)),
                collateral: s.collateral,
                collateralType: s.collateralType,
                collateralName: collateralBytes32[s.collateralType],
                debt: s.debt,
                totalDebt,
                availableDebt,
                accumulatedRate,
                collateralRatio,
                currentRedemptionPrice,
                internalCollateralBalance: s.internalCollateralBalance?.balance || '0',
                currentLiquidationPrice: currentPrice?.liquidationPrice,
                liquidationCRatio: liquidationCRatio || '1',
                liquidationPenalty: liquidationPenalty || '1',
                liquidationPrice,
                totalAnnualizedStabilityFee: totalAnnualizedStabilityFee || '0',
                currentRedemptionRate: currentRedemptionRate || '0',
            } as ISafe
        })
        .sort((a, b) => Number(b.riskState) - Number(a.riskState) || Number(b.debt) - Number(a.debt))
}

export const getCollateralRatio = (
    totalCollateral: string,
    totalDebt: string,
    liquidationPrice: string,
    liquidationCRatio: string
) => {
    if (Number(totalCollateral) === 0) {
        return '0'
    } else if (Number(totalDebt) === 0) {
        return '∞'
    }
    const denominator = numeral(totalDebt).value()

    const numerator = numeral(totalCollateral).multiply(liquidationPrice).multiply(liquidationCRatio)

    const value = numerator.divide(denominator).multiply(100)

    return formatNumber(value.value().toString(), 2, true)
}

export const getLiquidationPrice = (
    totalCollateral: string,
    totalDebt: string,
    liquidationCRatio: string,
    currentRedemptionPrice: string
) => {
    if (Number(totalCollateral) === 0) {
        return '0'
    } else if (Number(totalDebt) === 0) {
        return '0'
    }

    const numerator = numeral(totalDebt)
        .multiply(liquidationCRatio)
        .multiply(currentRedemptionPrice)
        .divide(totalCollateral)

    return formatNumber(numerator.value().toString())
}

export const safeIsSafe = (totalCollateral: string, totalDebt: string, safetyPrice: string) => {
    if (isNaN(Number(totalDebt))) return true
    const totalDebtBN = BigNumber.from(toFixedString(totalDebt, 'WAD'))
    const totalCollateralBN = BigNumber.from(toFixedString(totalCollateral, 'WAD'))
    const safetyPriceBN = BigNumber.from(toFixedString(safetyPrice, 'RAY'))
    return totalDebtBN.lte(totalCollateralBN.mul(safetyPriceBN).div(gebUtils.RAY))
}

export enum RiskState {
    UNKNOWN,
    LOW,
    MEDIUM,
    HIGH,
    LIQUIDATION
}
export const ratioChecker = (currentLiquitdationRatio: number, minLiquidationRatio: number) => {
    const minLiquidationRatioPercent = minLiquidationRatio * 100
    const safestRatio = minLiquidationRatioPercent * 2.2
    const midSafeRatio = minLiquidationRatioPercent * 1.5

    if (currentLiquitdationRatio < minLiquidationRatioPercent && currentLiquitdationRatio > 0) {
        return RiskState.LIQUIDATION
    } else if (currentLiquitdationRatio >= safestRatio) {
        return RiskState.LOW
    } else if (currentLiquitdationRatio < safestRatio && currentLiquitdationRatio >= midSafeRatio) {
        return RiskState.MEDIUM
    } else if (currentLiquitdationRatio < midSafeRatio && currentLiquitdationRatio > 0) {
        return RiskState.HIGH
    } else {
        return RiskState.UNKNOWN
    }
}

export const getInterestOwed = (debt: string, accumulatedRate: string) => {
    const restAcc = numeral(accumulatedRate).subtract(1).value()
    return formatNumber(numeral(debt).multiply(restAcc).value().toString(), 4, true)
}

export const returnAvaiableDebt = (
    safetyPrice: string,
    accumulatedRate: string,
    currentCollatral = '0',
    prevCollatral = '0',
    prevDebt = '0'
) => {
    if (!safetyPrice || accumulatedRate === '0') {
        return '0'
    }

    const safetyPriceRay = BigNumber.from(BigNumber.from(toFixedString(safetyPrice, 'RAY')))
    const accumulatedRateRay = BigNumber.from(BigNumber.from(toFixedString(accumulatedRate, 'RAY')))
    const totalCollateralBN = returnTotalValue(currentCollatral, prevCollatral, false) as BigNumber

    const totalDebtBN = totalCollateralBN.mul(safetyPriceRay).div(gebUtils.RAY)
    const prevDebtBN = BigNumber.from(toFixedString(prevDebt, 'WAD'))
    const totalPrevDebt = prevDebtBN.mul(accumulatedRateRay).div(gebUtils.RAY)
    const availableDebt = totalDebtBN.sub(totalPrevDebt)
    return formatNumber(
        gebUtils.wadToFixed(availableDebt.lt(0) ? BigNumber.from('0') : availableDebt).toString()
    ).toString()
}

export const returnTotalDebt = (debt: string, accumulatedRate: string, beautify = true) => {
    const debtBN = BigNumber.from(toFixedString(debt, 'WAD'))
    const accumulatedRateBN = BigNumber.from(toFixedString(accumulatedRate, 'RAY'))

    const totalDebtBN = debtBN.mul(accumulatedRateBN).div(gebUtils.RAY)

    if (!beautify) return totalDebtBN
    return gebUtils.wadToFixed(totalDebtBN).toString()
}

export const returnTotalDebtPlusInterest = (
    safetyPrice: string,
    collateral: string,
    accumulatedRate: string,
    beautify = true
) => {
    if (!safetyPrice || !collateral || !accumulatedRate) {
        return '0'
    }
    const safetyPriceRay = BigNumber.from(BigNumber.from(toFixedString(safetyPrice, 'RAY')))
    const collateralBN = BigNumber.from(toFixedString(collateral, 'WAD'))
    const accumulatedRateBN = BigNumber.from(toFixedString(accumulatedRate, 'RAY'))
    const owedHAI = collateralBN.mul(safetyPriceRay).mul(accumulatedRateBN).div(gebUtils.RAY).div(gebUtils.RAY)

    if (!beautify) return owedHAI
    return formatNumber(gebUtils.wadToFixed(owedHAI).toString()).toString()
}

export const riskStateToStatus: Record<RiskState | number, Status> = {
    [RiskState.LOW]: Status.SAFE,
    [RiskState.MEDIUM]: Status.OKAY,
    [RiskState.HIGH]: Status.DANGER,
    [RiskState.LIQUIDATION]: Status.DANGER,
    [RiskState.UNKNOWN]: Status.UNKNOWN,
}
export const returnState = (state: number) => {
    switch (state) {
        case 1:
            return 'Low'
        case 2:
            return 'Medium'
        case 3:
            return 'High'
        case 4:
            return 'Liquidation'
        default:
            return ''
    }
}

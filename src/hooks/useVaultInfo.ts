import { useMemo } from 'react'
import numeral from 'numeral'
import { BigNumber, BigNumberish } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { useAccount } from 'wagmi'

import {
    type ILiquidationData,
    formatNumber,
    getCollateralRatio,
    getLiquidationPrice,
    getRatePercentage,
    returnAvaiableDebt,
    returnTotalDebt,
    returnTotalValue,
    safeIsSafe,
    toFixedString
} from '~/utils'
import { useStoreState } from '~/store'
import { useProxyAddress } from '~/hooks'

// export const LIQUIDATION_RATIO = 135 // percent
// export const ONE_DAY_WORTH_SF = parseEther('0.00001')

export enum VaultAction {
    DEPOSIT_BORROW,
    WITHDRAW_REPAY,
    CREATE,
    INFO
}
export type VaultStats = Record<'data' | 'prices' | 'info', {
    label: string,
    value: string | number,
    tip?: string,
    plainValue?: string | number
}[]>
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
    [VaultInfoError.MINIMUM_MINT]: `You must mint at least 1 $HAI to create a Vault`
}

export type VaultInfo = {
    error?: VaultInfoError,
    errorMessage?: string,
    parsedAmounts: {
        leftInput: string,
        rightInput: string
    },
    collateralName: string,
    totalCollateral: BigNumberish,
    totalDebt: BigNumberish,
    collateralRatio: BigNumberish,
    liquidationPrice: BigNumberish,
    availableCollateral: BigNumberish,
    availableHai: BigNumberish,
    liquidationData?: ILiquidationData,
    liquidationPenaltyPercentage: number,
    stabilityFeePercentage: string,
    balances: Record<string, BigNumberish>,
}

export function useVaultInfo(action: VaultAction): VaultInfo {
    const { address: account } = useAccount()
    const proxyAddress = useProxyAddress()
    const {
        safeModel: {
            safeData,
            singleSafe,
            liquidationData
        },
        connectWalletModel: { tokensFetchedData },
    } = useStoreState(state => state)

    const parsedAmounts = useMemo(() => ({
        leftInput: safeData.leftInput,
        rightInput: safeData.rightInput
    }), [safeData])

    // returns collateral amount and takes into consideration if its a new safe or not
    const collateral = useTotalCollateral(parsedAmounts.leftInput, action)
    // returns debt amount and takes into consideration if its a new safe or not
    const debt = useTotalDebt(parsedAmounts.rightInput, action)

    const collateralName = useMemo(() => (
        singleSafe?.collateralName || safeData.collateral
    ), [singleSafe, safeData])

    const balances = useMemo(() => ({
        [collateralName]: tokensFetchedData[collateralName]?.balanceE18,
        HAI: tokensFetchedData.HAI?.balanceE18
    }), [tokensFetchedData, collateralName])

    const {
        currentRedemptionPrice,
        globalDebtCeiling,
        perSafeDebtCeiling
    } = liquidationData || {}
    const collateralLiquidationData = liquidationData?.collateralLiquidationData[collateralName]
    const {
        accumulatedRate = '0',
        currentPrice,
        debtFloor,
        liquidationCRatio,
        liquidationPenalty,
        safetyCRatio
    } = collateralLiquidationData || {}
    const {
        liquidationPrice: fetchedLiquidationPrice,
        safetyPrice
    } = currentPrice || {}

    // Checks if for collateralRatio safety if its safe or not
    const isSafe = currentPrice?.safetyPrice
        ? safeIsSafe(collateral, debt, currentPrice.safetyPrice)
        : true

    // returns collateral ratio
    const collateralRatio = useMemo(() => {
        if (!fetchedLiquidationPrice || !liquidationCRatio) return 0

        return getCollateralRatio(
            collateral,
            debt,
            fetchedLiquidationPrice,
            liquidationCRatio
        )
    }, [collateral, debt, fetchedLiquidationPrice, liquidationCRatio])

    // returns liquidation price
    const liquidationPrice = useMemo(() => {
        if (!currentRedemptionPrice || !liquidationCRatio) return ''

        return getLiquidationPrice(
            collateral,
            debt, 
            liquidationCRatio,
            currentRedemptionPrice
        ).toString()
    }, [collateral, debt, liquidationCRatio, currentRedemptionPrice])

    // returns available ETH (collateral)
    // singleSafe means already a deployed safe
    const availableCollateral = useMemo(() => {
        if (!singleSafe) return '0.00'

        if (action !== VaultAction.DEPOSIT_BORROW || !singleSafe.collateralName) {
            return singleSafe.collateral
        }
        const value = formatEther(tokensFetchedData[singleSafe.collateralName].balanceE18)
        return formatNumber(value, 2)
    }, [singleSafe, tokensFetchedData, action])

    // returns available HAI (debt)
    // singleSafe means already a deployed safe
    const availableHai = useMemo(() => {
        if (!collateralLiquidationData || !safetyPrice) return '0.00'

        if (action === VaultAction.CREATE) {
            return returnAvaiableDebt(
                safetyPrice,
                accumulatedRate,
                parsedAmounts.leftInput
            )
        }
        if (singleSafe) {
            if (action === VaultAction.DEPOSIT_BORROW) {
                return returnAvaiableDebt(
                    safetyPrice,
                    accumulatedRate,
                    parsedAmounts.leftInput,
                    singleSafe.collateral,
                    singleSafe.debt
                )
            }
            return returnTotalDebt(singleSafe.debt, accumulatedRate)
        }

        return '0.00'
    }, [collateralLiquidationData, safetyPrice, accumulatedRate, parsedAmounts, singleSafe, action])

    const liquidationPenaltyPercentage = Number(liquidationPenalty) - 1

    // const formattedLiquidationPenaltyPercentage = toPercentage(liquidationPenaltyPercentage || 0.2, 0)

    const stabilityFeePercentage = useMemo(() => {
        return collateralLiquidationData
            ? getRatePercentage(collateralLiquidationData.totalAnnualizedStabilityFee, 2).toString()
            : '-'
    }, [collateralLiquidationData])

    const availableCollateralBN = BigNumber.from(toFixedString(availableCollateral.toString(), 'WAD'))
    const availableHaiBN = BigNumber.from(toFixedString(availableHai.toString(), 'WAD'))
    // account's HAI balance into BigNumber
    const haiBalanceBN = balances.HAI
        ? BigNumber.from(toFixedString(balances.HAI.toString(), 'WAD'))
        : BigNumber.from('0')

    const leftInputBN = parsedAmounts.leftInput
        ? BigNumber.from(toFixedString(parsedAmounts.leftInput, 'WAD'))
        : BigNumber.from('0')

    const rightInputBN = parsedAmounts.rightInput
        ? BigNumber.from(toFixedString(parsedAmounts.rightInput, 'WAD'))
        : BigNumber.from('0')
    // returns debtFloor from liquidation data from store
    const debtFloorBN = BigNumber.from(
        toFixedString(collateralLiquidationData ? collateralLiquidationData.debtFloor : '0', 'WAD')
    )
    const totalDebtBN = BigNumber.from(toFixedString(debt, 'WAD'))

    // returns stats data used into stats display of the safe
    // const stats: VaultStats = useMemo(() => {
    //     return {
    //         data: [
    //             {
    //                 label: `Total ${collateralName} Collateral`,
    //                 value: collateral === '0' ? '-' : collateral,
    //                 plainValue: collateral,
    //             },
    //             {
    //                 label: 'Total HAI Debt',
    //                 value: debt === '0' ? '-' : debt,
    //                 plainValue: debt,
    //             },
    //             {
    //                 label: 'Collateral Ratio',
    //                 value: (Number(collateralRatio) > 0 ? collateralRatio : '∞') + '%',
    //                 plainValue: collateralRatio,
    //             },
    //             {
    //                 label: 'Collateral Type',
    //                 value: collateralName,
    //             },
    //         ],
    //         prices: [
    //             {
    //                 label: `${collateralName} Price (Delayed)`,
    //                 value: '$' + formatNumber(collateralPrice.toString()),
    //                 tip: t('eth_osm_tip'),
    //             },
    //             {
    //                 label: 'HAI Redemption Price',
    //                 value: '$' + formatNumber(currentRedemptionPrice, 3),
    //                 tip: t('redemption_price_tip'),
    //             },
    //             {
    //                 label: 'Liquidation Price',
    //                 value:
    //                     Number(liquidationPrice) > 0
    //                         ? Number(liquidationPrice) > Number(collateralPrice)
    //                             ? 'Invalid'
    //                             : '$' + liquidationPrice
    //                         : '$' + 0,
    //                 tip: t('liquidation_price_tip'),
    //             },
    //         ],
    //         info: [
    //             {
    //                 label: 'Total Liquidation Penalty',
    //                 value: formattedLiquidationPenaltyPercentage,
    //                 tip: t('liquidation_penalty_tip'),
    //             },
    //             {
    //                 label: 'Stability Fee',
    //                 value: stabilityFeePercentage + '%',
    //                 tip: t('stability_fee_tip'),
    //             },
    //         ],
    //     }
    // }, [
    //     collateralPrice,
    //     collateralName,
    //     collateralRatio,
    //     liquidationPrice,
    //     formattedLiquidationPenaltyPercentage,
    //     currentRedemptionPrice,
    //     stabilityFeePercentage,
    //     t,
    //     collateral,
    //     debt,
    // ])

    const { error, errorMessage }: Pick<VaultInfo, 'error' | 'errorMessage'> = useMemo(() => {
        if (!account) return { error: VaultInfoError.NO_WALLET }
        if (!proxyAddress) return { error: VaultInfoError.NO_PROXY }

        if (action === VaultAction.DEPOSIT_BORROW) {
            if (leftInputBN.isZero() && rightInputBN.isZero()) {
                return { error: VaultInfoError.ZERO_AMOUNT }
            }
            if (leftInputBN.gt(availableCollateralBN)) {
                return { error: VaultInfoError.INSUFFICIENT_COLLATERAL }
            }
            if (rightInputBN.gt(availableHaiBN)) {
                return { error: VaultInfoError.INSUFFICIENT_HAI }
            }
        }
        else if (action === VaultAction.WITHDRAW_REPAY) {
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
                errorMessage: `The minimum amount of debt per vault is ${debtFloorFormatted} HAI`
            }
        }
        if (!isSafe && Number(collateralRatio) >= 0) {
            return {
                error: VaultInfoError.COLLATERAL_RATIO,
                errorMessage: `Too much debt, which would bring vault below ${Number(safetyCRatio) * 100}% collateralization ratio`
            }
        }
        if (numeral(debt).value() > numeral(globalDebtCeiling).value()) {
            return {
                error: VaultInfoError.GLOBAL_DEBT_CEILING,
                errorMessage: `Cannot exceed global debt ceiling (${globalDebtCeiling})`
            }
        }
        if (numeral(debt).value() > numeral(perSafeDebtCeiling).value()) {
            return {
                error: VaultInfoError.HAI_DEBT_CEILING,
                errorMessage: `Cannot exceed per vault $HAI debt ceiling (${perSafeDebtCeiling})`
            }
        }
        if (action === VaultAction.CREATE) {
            if (leftInputBN.isZero()) {
                return { error: VaultInfoError.ZERO_AMOUNT }
            }
            if (!rightInputBN.isZero() && rightInputBN.lt(1)) {
                return { error: VaultInfoError.MINIMUM_MINT }
            }
        }
        else if (perSafeDebtCeiling) {
            const perSafeDebtCeilingBN = BigNumber.from(toFixedString(perSafeDebtCeiling, 'WAD'))
            if (totalDebtBN.gte(perSafeDebtCeilingBN)) {
                return {
                    error: VaultInfoError.INDIVIDUAL_DEBT_CEILING,
                    errorMessage: `Individual safe can't have more than ${perSafeDebtCeiling} HAI of debt`
                }
            }
        }

        return {}
    }, [
        account, proxyAddress, action,
        leftInputBN, rightInputBN,
        totalDebtBN, debtFloorBN,
        isSafe, collateralRatio, safetyCRatio,
        availableCollateralBN, availableHaiBN, haiBalanceBN,
        debt, debtFloor, globalDebtCeiling, perSafeDebtCeiling
    ])

    return {
        error,
        errorMessage: error ? errorMessage || vaultInfoErrors[error]: undefined,
        parsedAmounts,
        collateralName,
        totalCollateral: collateral,
        totalDebt: debt,
        collateralRatio,
        liquidationPrice,
        availableCollateral,
        availableHai,
        liquidationData,
        liquidationPenaltyPercentage,
        stabilityFeePercentage,
        balances,
    }
}

function useTotalCollateral(leftInput: string, action: VaultAction) {
    const { singleSafe } = useStoreState(({ safeModel }) => safeModel)

    const totalCollateral = useMemo(() => {
        if (!singleSafe) return leftInput

        if (action === VaultAction.WITHDRAW_REPAY) {
            return returnTotalValue(singleSafe.collateral, leftInput, true, true).toString()
        }
        return returnTotalValue(singleSafe.collateral, leftInput).toString()
    }, [singleSafe, leftInput, action])

    return totalCollateral || '0'
}

function useTotalDebt(rightInput: string, action: VaultAction) {
    const { singleSafe, liquidationData } = useStoreState(({ safeModel }) => safeModel)

    const { accumulatedRate = '0' } = singleSafe?.collateralName
        ? liquidationData?.collateralLiquidationData[singleSafe.collateralName] || {}
        : {}

    const totalDebt = useMemo(() => {
        if (!singleSafe) return rightInput

        if (action === VaultAction.WITHDRAW_REPAY) {
            return returnTotalValue(
                returnTotalDebt(singleSafe.debt, accumulatedRate) as string,
                rightInput,
                true,
                true
            ).toString()
        }
        return returnTotalValue(
            returnTotalDebt(singleSafe.debt, accumulatedRate) as string,
            rightInput
        ).toString()
    }, [singleSafe, rightInput, action, accumulatedRate])

    if (Number(totalDebt || '0') <= 0.00001) return '0'

    return totalDebt
}

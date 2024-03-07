import { useMemo } from 'react'
import { formatEther } from 'ethers/lib/utils'

import type { CollateralLiquidationData, Debt, FormState } from '~/types'
import { VaultAction, formatSummaryValue, returnAvaiableDebt, returnTotalDebt, returnTotalValue } from '~/utils'
import { useStoreState } from '~/store'
import { useBalance } from '~/hooks'

export function useDebt(
    action: VaultAction,
    formState: FormState,
    collateralLiquidationData?: CollateralLiquidationData
): Debt {
    const {
        vaultModel: { liquidationData, singleVault },
        connectWalletModel: { tokensData },
    } = useStoreState((state) => state)

    const { accumulatedRate = '0' } = collateralLiquidationData || {}

    const total: Debt['total'] = useMemo(() => {
        if (!singleVault)
            return {
                current: undefined,
                after: formatSummaryValue(formState.borrow || '0', { maxDecimals: 4 })!,
            }

        const current = formatSummaryValue(formatEther(returnTotalDebt(singleVault.debt, accumulatedRate, false)), {
            maxDecimals: 4,
            minSigFigs: 1,
        })!
        switch (action) {
            case VaultAction.DEPOSIT_REPAY:
            case VaultAction.WITHDRAW_REPAY: {
                const valueBN =
                    Math.abs(parseFloat(current.raw) - parseFloat(formState.repay || '0')) < 0.1
                        ? '0'
                        : returnTotalValue(current.raw, formState.repay || '0', false, true).toString()
                return {
                    current,
                    after: formatSummaryValue(formatEther(valueBN), { maxDecimals: 4 })!,
                }
            }
            case VaultAction.CREATE:
            case VaultAction.DEPOSIT_BORROW:
            case VaultAction.WITHDRAW_BORROW:
            default: {
                const valueBN = returnTotalValue(current.raw, formState.borrow || '0', false, false).toString()
                return {
                    current,
                    after: formatSummaryValue(formatEther(valueBN), { maxDecimals: 4 })!,
                }
            }
        }
        // if (action === VaultAction.WITHDRAW_REPAY) {
        //     return returnTotalValue(
        //         returnTotalDebt(singleVault.debt, accumulatedRate) as string,
        //         rightInput,
        //         true,
        //         true
        //     ).toString()
        // }
        // return returnTotalValue(returnTotalDebt(singleVault.debt, accumulatedRate) as string, rightInput).toString()
    }, [singleVault, formState.borrow, formState.repay, action, accumulatedRate])

    const available: Debt['available'] = useMemo(() => {
        if (!collateralLiquidationData?.currentPrice.safetyPrice) return formatSummaryValue('0')!
        if (!singleVault || action === VaultAction.CREATE)
            return formatSummaryValue(
                returnAvaiableDebt(
                    collateralLiquidationData.currentPrice.safetyPrice,
                    accumulatedRate,
                    formState.deposit || '0'
                ),
                { maxDecimals: 4, minSigFigs: 1 }
            )!

        return formatSummaryValue(
            returnAvaiableDebt(
                collateralLiquidationData.currentPrice.safetyPrice,
                accumulatedRate,
                formState.deposit || '0',
                singleVault.collateral,
                singleVault.debt
            ),
            { maxDecimals: 4, minSigFigs: 1 }
        )!
        // switch (action) {
        //     case VaultAction.DEPOSIT_BORROW:
        //     case VaultAction.WITHDRAW_BORROW:
        //         return returnAvaiableDebt(
        //             collateralLiquidationData.currentPrice.safetyPrice,
        //             accumulatedRate,
        //             deposit,
        //             singleVault.collateral,
        //             singleVault.debt
        //         )
        //     case VaultAction.DEPOSIT_REPAY:
        //     case VaultAction.WITHDRAW_REPAY:
        //     default:
        //         return returnTotalDebt(singleVault.debt, accumulatedRate).toString()
        // }
        // if (action === VaultAction.DEPOSIT_BORROW) {
        //     return returnAvaiableDebt(
        //         collateralLiquidationData.currentPrice.safetyPrice,
        //         accumulatedRate,
        //         leftInput,
        //         singleVault.collateral,
        //         singleVault.debt
        //     )
        // }
        // return returnTotalDebt(singleVault.debt, accumulatedRate).toString()
    }, [collateralLiquidationData, accumulatedRate, singleVault, action, formState.deposit])

    return {
        data: tokensData?.HAI,
        total: total,
        available,
        balance: useBalance('HAI'),
        priceInUSD: liquidationData?.currentRedemptionPrice || '1',
    }
}

import { useMemo } from 'react'
import { formatEther } from 'ethers/lib/utils'

import type { CollateralLiquidationData, Debt } from '~/types'
import {
    VaultAction,
    returnAvaiableDebt,
    returnTotalDebt,
    returnTotalValue,
} from '~/utils'
import { useStoreState } from '~/store'

export function useDebt(action: VaultAction, collateralLiquidationData?: CollateralLiquidationData): Debt {
    const {
        safeModel: {
            liquidationData,
            safeData: { leftInput, rightInput },
            singleSafe,
        },
        connectWalletModel: {
            tokensData,
            tokensFetchedData,
        },
    } = useStoreState(state => state)

    const { accumulatedRate = '0' } = collateralLiquidationData || {}

    const total = useMemo(() => {
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

    const available = useMemo(() => {
        if (!collateralLiquidationData?.currentPrice.safetyPrice) return '0.00'

        if (action === VaultAction.CREATE) {
            return returnAvaiableDebt(
                collateralLiquidationData.currentPrice.safetyPrice,
                accumulatedRate,
                leftInput
            )
        }
        if (singleSafe) {
            if (action === VaultAction.DEPOSIT_BORROW) {
                return returnAvaiableDebt(
                    collateralLiquidationData.currentPrice.safetyPrice,
                    accumulatedRate,
                    leftInput,
                    singleSafe.collateral,
                    singleSafe.debt
                )
            }
            return returnTotalDebt(singleSafe.debt, accumulatedRate).toString()
        }

        return '0.00'
    }, [collateralLiquidationData, accumulatedRate, singleSafe, action, leftInput])

    return {
        data: tokensData?.HAI,
        total: (Number(total || '0') <= 0.00001)
            ? '0'
            : total,
        available,
        balance: formatEther(tokensFetchedData.HAI?.balanceE18 || '0'),
        priceInUSD: liquidationData?.currentRedemptionPrice || '1',
    }
}

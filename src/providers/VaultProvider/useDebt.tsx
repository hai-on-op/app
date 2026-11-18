import { useMemo } from 'react'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { utils as gebUtils } from '@hai-on-op/sdk'

import type { Collateral, Debt, FormState } from '~/types'
import { VaultAction, formatSummaryValue, getBorrowableHai, toFixedString } from '~/utils'
import { type VaultDebtLimits, getGeneratedDebtWad, getMaxBorrowWad } from '~/services/vaultDebtLimits'
import { useStoreState } from '~/store'
import { useBalance } from '~/hooks'

export function useDebt(
    action: VaultAction,
    formState: FormState,
    collateral: Collateral,
    limits?: VaultDebtLimits
): Debt {
    const {
        vaultModel: { liquidationData, singleVault },
        connectWalletModel: { tokensData },
    } = useStoreState((state) => state)

    const { accumulatedRate = '0', currentPrice } = collateral.liquidationData || {}

    const { total, payoff, afterRad } = useMemo(() => {
        const { RAY } = gebUtils
        const zero = BigNumber.from(0)
        const rate = limits?.rateRay ?? BigNumber.from(toFixedString(accumulatedRate, 'RAY'))
        const normalizedDebt = limits?.safeDebtWad ?? BigNumber.from(toFixedString(singleVault?.debt || '0', 'WAD'))
        const debtRad = normalizedDebt.mul(rate)
        const repaying = action === VaultAction.DEPOSIT_REPAY || action === VaultAction.WITHDRAW_REPAY
        const withWithdrawal =
            (action === VaultAction.WITHDRAW_REPAY || action === VaultAction.WITHDRAW_BORROW) &&
            Number(formState.withdraw) > 0
        // Standalone repayAllDebt spends the proxy's internal coins. The combined payoff spends the handler's.
        const payoffCredit = (withWithdrawal ? limits?.creditRad : limits?.proxyCreditRad) ?? zero
        const formatDebt = (rad: BigNumber) =>
            formatSummaryValue(formatEther(rad.add(RAY.sub(1)).div(RAY)), { maxDecimals: 4, minSigFigs: 1 })!
        // _getRepaidDebt subtracts credit without capping it. An excess balance would underflow.
        const payoff = debtRad.gt(0) && payoffCredit.lte(debtRad) ? formatDebt(debtRad.sub(payoffCredit)) : undefined

        let afterRad = debtRad
        if (repaying) {
            const repay = BigNumber.from(toFixedString(formState.repay || '0', 'WAD'))
            if (formState.repayAll && payoff) afterRad = zero
            else if (repay.gt(0) && rate.gt(0)) {
                // Both fixed-amount methods consume all available SAFE handler coins, capped at its debt.
                const availableRad = repay.mul(RAY).add(limits?.creditRad ?? zero)
                const cancelled = availableRad.div(rate)
                afterRad = cancelled.gte(normalizedDebt) ? zero : normalizedDebt.sub(cancelled).mul(rate)
            }
        } else {
            const borrow = BigNumber.from(toFixedString(formState.borrow || '0', 'WAD'))
            afterRad = debtRad.add(limits ? getGeneratedDebtWad(borrow, limits).mul(rate) : borrow.mul(RAY))
        }

        return {
            total: { current: singleVault ? formatDebt(debtRad) : undefined, after: formatDebt(afterRad) },
            payoff,
            afterRad: afterRad.toString(),
        }
    }, [
        singleVault,
        formState.borrow,
        formState.repay,
        formState.repayAll,
        formState.withdraw,
        action,
        accumulatedRate,
        limits,
    ])

    const available = useMemo(
        () =>
            formatSummaryValue(
                limits
                    ? formatEther(
                          getMaxBorrowWad(BigNumber.from(toFixedString(collateral.total.after.raw, 'WAD')), limits)
                      )
                    : getBorrowableHai(
                          collateral.total.after.raw,
                          singleVault?.debt || '0',
                          accumulatedRate,
                          currentPrice?.safetyPrice
                      ),
                { maxDecimals: 4, minSigFigs: 1 }
            )!,
        [collateral.total.after.raw, singleVault?.debt, accumulatedRate, currentPrice?.safetyPrice, limits]
    )

    return {
        data: tokensData?.HAI,
        total,
        payoff,
        afterRad,
        available,
        balance: useBalance('HAI'),
        priceInUSD: liquidationData?.currentRedemptionPrice || '1',
    }
}

import { useMemo } from 'react'

import type { Collateral, Debt, IVault, SummaryCurrency, SummaryItem, SummaryItemValue } from '~/types'
import {
    getRatePercentage,
    formatSummaryCurrency,
    formatSummaryPercentage,
    formatSummaryValue,
    getMinimumAllowableCollateral,
} from '~/utils'

export type Summary = {
    collateral: SummaryItem<SummaryCurrency>
    debt: SummaryItem<SummaryCurrency>
    collateralRatio: SummaryItem
    stabilityFee: SummaryItemValue
    liquidationPrice: SummaryItem
    availableCollateral?: SummaryItemValue
}

type Props = {
    vault?: IVault
    collateral: Collateral
    debt: Debt
    simulatedCR?: string
    liquidationPrice: string
}
export function useSummary({ vault, collateral, debt, simulatedCR, liquidationPrice }: Props): Summary {
    const stabilityFee = vault?.totalAnnualizedStabilityFee || collateral.liquidationData?.totalAnnualizedStabilityFee

    const availableCollateral = useMemo(() => {
        if (!collateral.total.current || !collateral.liquidationData) return formatSummaryValue('0')!

        const minCollateral = getMinimumAllowableCollateral(
            debt.total.current?.raw || debt.total.after.raw,
            collateral.liquidationData.currentPrice.liquidationPrice
        )

        const maxWithdraw = Number(collateral.total.current.raw) - Number(minCollateral)
        return Number(collateral.total.current?.raw || 0) > maxWithdraw
            ? formatSummaryValue(maxWithdraw.toString(), { maxDecimals: 4, minSigFigs: 1 })
            : collateral.total.current
    }, [collateral, debt])

    return {
        collateral: {
            current: formatSummaryCurrency(collateral.total.current?.raw || vault?.collateral, collateral.priceInUSD),
            after: formatSummaryCurrency(collateral.total.after.raw || '0', collateral.priceInUSD)!,
        },
        debt: {
            current: formatSummaryCurrency(debt.total.current?.raw || vault?.totalDebt, debt.priceInUSD),
            after: formatSummaryCurrency(debt.total.after.raw || '0', debt.priceInUSD)!,
        },
        collateralRatio: {
            current: formatSummaryPercentage(vault?.collateralRatio, 0.01),
            after: formatSummaryPercentage(simulatedCR || '0', 0.01)!,
        },
        stabilityFee: stabilityFee
            ? formatSummaryPercentage(getRatePercentage(stabilityFee, 4, true).toString(), -1)!
            : {
                  raw: '',
                  formatted: '--%',
              },
        liquidationPrice: {
            current: formatSummaryValue(vault?.liquidationPrice, {
                maxDecimals: 3,
                style: 'currency',
            }),
            after: formatSummaryValue(liquidationPrice || '0', {
                maxDecimals: 3,
                style: 'currency',
            })!,
        },
        availableCollateral,
    }
}

export const DEFAULT_SUMMARY: Summary = {
    collateral: {
        current: undefined,
        after: {
            raw: '',
            formatted: '',
            usdRaw: '',
            usdFormatted: '$--',
        },
    },
    debt: {
        current: undefined,
        after: {
            raw: '',
            formatted: '',
            usdRaw: '',
            usdFormatted: '$--',
        },
    },
    collateralRatio: {
        current: undefined,
        after: {
            raw: '',
            formatted: '--%',
        },
    },
    stabilityFee: {
        raw: '',
        formatted: '--%',
    },
    liquidationPrice: {
        current: undefined,
        after: {
            raw: '',
            formatted: '$--',
        },
    },
}

import type {
    Collateral,
    Debt,
    IVault,
    SummaryCurrency,
    SummaryItem,
    SummaryItemValue,
} from '~/types'
import {
    getRatePercentage,
    formatSummaryCurrency,
    formatSummaryPercentage,
    formatSummaryValue,
} from '~/utils'

export type Summary = {
    collateral: SummaryItem<SummaryCurrency>,
    debt: SummaryItem<SummaryCurrency>,
    collateralRatio: SummaryItem,
    stabilityFee: SummaryItemValue,
    liquidationPrice: SummaryItem,
}

type Props = {
    vault?: IVault,
    collateral: Collateral,
    debt: Debt,
    simulatedCR?: string,
    liquidationPrice: string,
}
export function useSummary({
    vault,
    collateral,
    debt,
    simulatedCR,
    liquidationPrice,
}: Props): Summary {
    const stabilityFee = vault?.totalAnnualizedStabilityFee
        || collateral.liquidationData?.totalAnnualizedStabilityFee
    return {
        collateral: {
            current: formatSummaryCurrency(vault?.collateral, collateral.priceInUSD),
            after: formatSummaryCurrency(collateral.total || '0', collateral.priceInUSD)!,
        },
        debt: {
            current: formatSummaryCurrency(vault?.debt, debt.priceInUSD),
            after: formatSummaryCurrency(debt.total || '0', debt.priceInUSD)!,
        },
        collateralRatio: {
            current: formatSummaryPercentage(vault?.collateralRatio, 0.01),
            after: formatSummaryPercentage(simulatedCR || '0', 0.01)!,
        },
        stabilityFee: stabilityFee
            ? formatSummaryPercentage(
                (getRatePercentage(stabilityFee, 4, true)).toString()
            )!
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

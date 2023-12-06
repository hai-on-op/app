import {
    type Collateral,
    type Debt,
    type ISafe,
    type SummaryItem,
    type SummaryItemValue,
    formatNumberWithStyle
} from "~/utils"

type SummaryCurrency = {
    usdRaw: string,
    usdFormatted: string
}
export type Summary = {
    collateral: SummaryItem<SummaryCurrency>,
    debt: SummaryItem<SummaryCurrency>,
    collateralRatio: SummaryItem,
    stabilityFee: SummaryItemValue,
    liquidationPrice: SummaryItem
}

type Props = {
    vault?: ISafe,
    collateral: Collateral,
    debt: Debt,
    simulatedCR?: string,
    liquidationPrice: string,
    stabilityFeePercentage: string
}
export function useSummary({
    vault,
    collateral,
    debt,
    simulatedCR,
    liquidationPrice,
    stabilityFeePercentage
}: Props): Summary {
    return {
        collateral: {
            current: formatSummaryCurrency(vault?.collateral, collateral.priceInUSD),
            after: formatSummaryCurrency(collateral.total || '0', collateral.priceInUSD)!
        },
        debt: {
            current: formatSummaryCurrency(vault?.debt, debt.priceInUSD),
            after: formatSummaryCurrency(debt.total || '0', debt.priceInUSD)!
        },
        collateralRatio: {
            current: formatSummaryPercentage(vault?.collateralRatio, 0.01),
            after: formatSummaryPercentage(simulatedCR || '0', 0.01)!
        },
        stabilityFee: formatSummaryPercentage(
            vault?.totalAnnualizedStabilityFee || stabilityFeePercentage,
            0.01
        )!,
        liquidationPrice: {
            current: vault?.liquidationPrice
                ? {
                    raw: vault.liquidationPrice,
                    formatted: formatNumberWithStyle(vault.liquidationPrice, {
                        maxDecimals: 3,
                        style: 'currency'
                    })
                }
                : undefined,
            after: {
                raw: liquidationPrice,
                formatted: formatNumberWithStyle(liquidationPrice || '0', {
                    maxDecimals: 3,
                    style: 'currency'
                })
            }
        }
    }
}

function formatSummaryCurrency(value: string | undefined, conversionFactor?: string) {
    if (!value) return undefined

    const usdRaw = (parseFloat(value) * parseFloat(conversionFactor || '0')).toString()
    const summary: SummaryItem<SummaryCurrency>['current'] = {
        raw: value,
        formatted: formatNumberWithStyle(value, { maxDecimals: 4 }),
        usdRaw,
        usdFormatted: formatNumberWithStyle(usdRaw, { style: 'currency' })
    }
    return summary
}

function formatSummaryPercentage(value: string | undefined, scalingFactor?: number) {
    if (typeof value === 'undefined') return undefined

    return {
        raw: value,
        formatted: value && !isNaN(Number(value))
            ? formatNumberWithStyle(value, {
                scalingFactor,
                style: 'percent',
                maxDecimals: 4
            })
            : '--%'
    }
}

export const DEFAULT_SUMMARY: Summary = {
    collateral: {
        current: undefined,
        after: {
            raw: '',
            formatted: '',
            usdRaw: '',
            usdFormatted: '$--'
        }
    },
    debt: {
        current: undefined,
        after: {
            raw: '',
            formatted: '',
            usdRaw: '',
            usdFormatted: '$--'
        }
    },
    collateralRatio: {
        current: undefined,
        after: {
            raw: '',
            formatted: '--%'
        }
    },
    stabilityFee: {
        raw: '',
        formatted: '--%'
    },
    liquidationPrice: {
        current: undefined,
        after: {
            raw: '',
            formatted: '$--'
        }
    }
}

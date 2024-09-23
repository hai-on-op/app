import { useMemo } from 'react'
import { ApolloError, useQuery } from '@apollo/client'

import type { CollateralStat, SummaryItemValue } from '~/types'
import {
    SYSTEMSTATE_QUERY,
    type QuerySystemStateData,
    formatSummaryValue,
    formatSummaryCurrency,
    formatSummaryPercentage,
    tokenAssets,
    DEPRECATED_COLLATERALS,
} from '~/utils'

export type SystemData = {
    loading: boolean
    error?: ApolloError
    data?: QuerySystemStateData
    summary?: {
        totalCollateralLocked: SummaryItemValue
        globalCRatio: SummaryItemValue
        totalVaults: SummaryItemValue
        systemSurplus: SummaryItemValue
        erc20Supply: SummaryItemValue
        redemptionPrice: SummaryItemValue
        redemptionRate: SummaryItemValue
        debtAvailableToSettle: SummaryItemValue
        collateralStats: Record<string, CollateralStat>
    }
}

export function useSystemData(): SystemData {
    const { data, loading, error } = useQuery<QuerySystemStateData>(SYSTEMSTATE_QUERY)

    const formattedData = useMemo(() => {
        if (!data) return undefined

        const {
            collateralTypes,
            systemStates: [
                {
                    globalDebt,
                    systemSurplus,
                    totalActiveSafeCount,
                    currentRedemptionPrice,
                    currentRedemptionRate,
                    erc20CoinTotalSupply,
                    debtAvailableToSettle,
                },
            ],
        } = data

        // Filtering out deprecated collaterals
        const activeCollateralTypes = collateralTypes.filter(
            ({ id }) => !DEPRECATED_COLLATERALS.includes(id.toUpperCase())
        )

        const { total, collateralStats } = activeCollateralTypes.reduce(
            (stats, { id, totalCollateralLockedInSafes, debtAmount, debtCeiling, currentPrice }) => {
                if (currentPrice) {
                    const totalCollateral = formatSummaryCurrency(totalCollateralLockedInSafes, currentPrice.value)
                    const totalDebt = formatSummaryCurrency(debtAmount, currentRedemptionPrice.value || '1')
                    const ratioRaw = parseFloat(totalCollateral?.usdRaw || '0') / parseFloat(totalDebt?.usdRaw || '0')
                    const ratio = formatSummaryPercentage(isNaN(ratioRaw) ? '' : ratioRaw.toString())
                    const key = tokenAssets[id]
                        ? id
                        : Object.values(tokenAssets).find(({ name }) => id === name)?.symbol || id

                    const debtCeilingPercent = (parseFloat(debtAmount || '0') * 100) / parseFloat(debtCeiling || '0')

                    const debt = {
                        debtAmount,
                        debtCeiling,
                        ceilingPercent: debtCeilingPercent,
                    }

                    stats.collateralStats[key] = {
                        debt,
                        totalCollateral,
                        totalDebt,
                        ratio,
                    }
                    stats.total += parseFloat(totalCollateral?.usdRaw || '0')
                }
                return stats
            },
            { total: 0, collateralStats: {} as Record<string, CollateralStat> }
        )

        const cRatio = parseFloat(globalDebt)
            ? total / (parseFloat(globalDebt) * parseFloat(currentRedemptionPrice.value || '1'))
            : 0

        return {
            totalCollateralLocked: formatSummaryValue(total.toString(), {
                maxDecimals: 0,
                style: 'currency',
            })!,
            collateralStats,
            globalCRatio: formatSummaryValue(cRatio.toString(), {
                maxDecimals: 1,
                style: 'percent',
            })!,
            totalVaults: formatSummaryValue(totalActiveSafeCount || '0', { maxDecimals: 0 })!,
            systemSurplus: formatSummaryValue(systemSurplus, {
                maxDecimals: 0,
                // style: 'currency',
            })!,
            erc20Supply: formatSummaryValue(erc20CoinTotalSupply, { maxDecimals: 0 })!,
            redemptionPrice: formatSummaryValue(currentRedemptionPrice.value, {
                maxDecimals: 3,
                style: 'currency',
            })!,
            redemptionRate: formatSummaryValue((Number(currentRedemptionRate.annualizedRate) - 1).toString(), {
                maxDecimals: 1,
                style: 'percent',
            })!,
            debtAvailableToSettle: formatSummaryValue(debtAvailableToSettle, { maxDecimals: 2 })!,
        }
    }, [data])

    return {
        loading,
        error,
        data,
        summary: formattedData,
    }
}

import { useMemo } from 'react'
import { ApolloError, useQuery } from '@apollo/client'

import type { SummaryItemValue } from '~/types'
import { SYSTEMSTATE_QUERY, type QuerySystemStateData, formatSummaryValue } from '~/utils'

export type SystemData = {
    loading: boolean,
    error?: ApolloError,
    data?: QuerySystemStateData,
    summary?: {
        totalCollateralLocked: SummaryItemValue,
        globalCRatio: SummaryItemValue,
        totalVaults: SummaryItemValue,
        systemSurplus: SummaryItemValue,
        erc20Supply: SummaryItemValue,
        redemptionPrice: SummaryItemValue,
        redemptionRate: SummaryItemValue,
    },
}

export function useSystemData(): SystemData {
    const { data, loading, error } = useQuery<QuerySystemStateData>(SYSTEMSTATE_QUERY)

    const formattedData = useMemo(() => {
        if (!data) return undefined

        const {
            collateralTypes,
            systemStates: [{
                globalDebt,
                systemSurplus,
                totalActiveSafeCount,
                currentRedemptionPrice,
                currentRedemptionRate,
                erc20CoinTotalSupply,
            }],
        } = data
        const total = collateralTypes.reduce((sum, {
            totalCollateralLockedInSafes,
            currentPrice,
        }) => {
            if (currentPrice) {
                const collateralUSD = (
                    parseFloat(currentPrice.value) * parseFloat(totalCollateralLockedInSafes)
                )
                return sum + collateralUSD
            }
            return sum
        }, 0)
    
        const cRatio = total / (parseFloat(globalDebt) * parseFloat(currentRedemptionPrice.value || '0'))
    
        return {
            totalCollateralLocked: formatSummaryValue(total.toString(), {
                maxDecimals: 0,
                style: 'currency',
            })!,
            globalCRatio: formatSummaryValue(cRatio.toString(), {
                maxDecimals: 1,
                style: 'percent',
            })!,
            totalVaults: formatSummaryValue(totalActiveSafeCount || '0', { maxDecimals: 0 })!,
            systemSurplus: formatSummaryValue(systemSurplus, {
                maxDecimals: 0,
                style: 'currency',
            })!,
            erc20Supply: formatSummaryValue(erc20CoinTotalSupply, { maxDecimals: 0 })!,
            redemptionPrice: formatSummaryValue(currentRedemptionPrice.value, {
                maxDecimals: 3,
                style: 'currency',
            })!,
            redemptionRate: formatSummaryValue(
                (Number(currentRedemptionRate.annualizedRate) - 1).toString(),
                {
                    maxDecimals: 1,
                    style: 'percent',
                }
            )!,
        }
    }, [data])

    return {
        loading,
        error,
        data,
        summary: formattedData,
    }
}

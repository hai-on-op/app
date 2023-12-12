import { useMemo } from 'react'
import { ApolloError, useQuery } from '@apollo/client'

import type { SummaryItemValue } from '~/types'
import { SYSTEMSTATE_QUERY, type QuerySystemStateData, formatNumberWithStyle } from '~/utils'

export type SystemData = {
    loading: boolean,
    error?: ApolloError,
    data?: QuerySystemStateData,
    summary?: {
        totalCollateralLocked: SummaryItemValue,
        globalLTV: SummaryItemValue,
        totalVaults: SummaryItemValue,
        systemSurplus: SummaryItemValue,
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
    
        const ltv = parseFloat(globalDebt) * parseFloat(currentRedemptionPrice.value || '0') / total
    
        return {
            totalCollateralLocked: {
                raw: total.toString(),
                formatted: formatNumberWithStyle(total.toString(), {
                    maxDecimals: 0,
                    style: 'currency',
                }),
            },
            globalLTV: {
                raw: ltv.toString(),
                formatted: formatNumberWithStyle(ltv.toString(), {
                    maxDecimals: 1,
                    style: 'percent',
                }),
            },
            totalVaults: {
                raw: totalActiveSafeCount || '0',
                formatted: Number(totalActiveSafeCount || '0').toLocaleString(),
            },
            systemSurplus: {
                raw: systemSurplus,
                formatted: formatNumberWithStyle(systemSurplus, {
                    maxDecimals: 0,
                    style: 'currency',
                }),
            },
        }
    }, [data])

    return {
        loading,
        error,
        data,
        summary: formattedData,
    }
}

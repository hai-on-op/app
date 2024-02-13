import { useEffect, useReducer, useState } from 'react'
import { formatEther } from 'ethers/lib/utils'
import { type AnalyticsData, fetchAnalyticsData } from '@hai-on-op/sdk'

import type { SummaryItemValue } from '~/types'
import {
    formatSummaryValue,
    transformToAnnualRate,
    transformToEightHourlyRate,
    transformToWadPercentage,
} from '~/utils'
import { usePublicGeb } from '~/hooks'

type TokenAnalyticsData = AnalyticsData['tokenAnalyticsData'][string] & {
    symbol: string
}
export type GebAnalyticsData = {
    erc20Supply: SummaryItemValue
    globalDebt: SummaryItemValue
    globalDebtUtilization: string
    globalDebtCeiling: SummaryItemValue
    surplusInTreasury: SummaryItemValue
    marketPrice: SummaryItemValue
    redemptionPrice: SummaryItemValue
    priceDiff: number
    annualRate: SummaryItemValue
    eightRate: SummaryItemValue
    pRate: SummaryItemValue
    iRate: SummaryItemValue
    tokenAnalyticsData: TokenAnalyticsData[]
}

export function useGebAnalytics() {
    const geb = usePublicGeb()

    const [refresher, forceRefresh] = useReducer((x) => x + 1, 0)
    const [data, setData] = useState(DEFAULT_ANALYTICS_DATA)

    useEffect(() => {
        if (!geb) return

        const getData = async () => {
            try {
                const result = await fetchAnalyticsData(geb)
                const marketPrice = formatEther(result.marketPrice).toString()
                const redemptionPrice = formatEther(result.redemptionPrice).toString()
                // all HAI price calculations should use/be relative to redemption price
                const priceDiff = 100 * Math.abs(1 - parseFloat(marketPrice) / parseFloat(redemptionPrice))

                setData((d) => ({
                    ...d,
                    erc20Supply: formatSummaryValue(formatEther(result.erc20Supply).toString(), { maxDecimals: 0 })!,
                    globalDebt: formatSummaryValue(formatEther(result.globalDebt).toString(), {
                        maxDecimals: 0,
                        // style: 'currency',
                    })!,
                    globalDebtCeiling: formatSummaryValue(formatEther(result.globalDebtCeiling).toString(), {
                        maxDecimals: 0,
                        style: 'currency',
                    })!,
                    globalDebtUtilization: transformToWadPercentage(result.globalDebt, result.globalDebtCeiling),
                    surplusInTreasury: formatSummaryValue(formatEther(result.surplusInTreasury).toString(), {
                        maxDecimals: 0,
                        // style: 'currency',
                    })!,
                    marketPrice: formatSummaryValue(marketPrice, {
                        maxDecimals: 3,
                        maxSigFigs: 3,
                        style: 'currency',
                    })!,
                    redemptionPrice: formatSummaryValue(redemptionPrice, {
                        maxDecimals: 3,
                        maxSigFigs: 3,
                        style: 'currency',
                    })!,
                    priceDiff,
                    annualRate: formatSummaryValue(transformToAnnualRate(result.redemptionRate, 27, true).toString(), {
                        maxDecimals: 1,
                        style: 'percent',
                    })!,
                    eightRate: formatSummaryValue(
                        transformToEightHourlyRate(result.redemptionRate, 27, true).toString(),
                        {
                            maxDecimals: 1,
                            style: 'percent',
                        }
                    )!,
                    pRate: formatSummaryValue(transformToAnnualRate(result.redemptionRatePTerm, 27, true).toString(), {
                        maxDecimals: 1,
                        style: 'percent',
                    })!,
                    iRate: formatSummaryValue(transformToAnnualRate(result.redemptionRateITerm, 27, true).toString(), {
                        maxDecimals: 1,
                        style: 'percent',
                    })!,
                    tokenAnalyticsData: Object.entries(result.tokenAnalyticsData).map(([key, value]) => ({
                        symbol: key,
                        ...value,
                    })),
                }))
            } catch (e: any) {
                console.error(e)
            }
        }
        getData()
        // eslint-disable-next-line
    }, [geb, refresher])

    return {
        data,
        forceRefresh,
    }
}

export const DEFAULT_ANALYTICS_DATA: GebAnalyticsData = {
    erc20Supply: {
        raw: '',
        formatted: '--',
    },
    globalDebt: {
        raw: '',
        formatted: '--',
    },
    globalDebtUtilization: '--%',
    globalDebtCeiling: {
        raw: '',
        formatted: '--',
    },
    surplusInTreasury: {
        raw: '',
        formatted: '--',
    },
    marketPrice: {
        raw: '',
        formatted: '$--',
    },
    redemptionPrice: {
        raw: '',
        formatted: '$--',
    },
    priceDiff: 0,
    annualRate: {
        raw: '',
        formatted: '--%',
    },
    eightRate: {
        raw: '',
        formatted: '--%',
    },
    pRate: {
        raw: '',
        formatted: '--%',
    },
    iRate: {
        raw: '',
        formatted: '--%',
    },
    tokenAnalyticsData: [],
}

import { createContext, useContext, useEffect, useState } from 'react'
import { useNetwork } from 'wagmi'
import { type AnalyticsData, fetchAnalyticsData } from '@hai-on-op/sdk'

import type { ReactChildren } from '~/types'
import {
    formatDataNumber,
    transformToWadPercentage,
    transformToAnnualRate,
    transformToEightHourlyRate,
} from '~/utils'
import { usePublicGeb } from '~/hooks'

type TokenAnalyticsData = AnalyticsData['tokenAnalyticsData'][string] & {
    symbol: string
}

type AnalyticsContext = {
    erc20Supply: string
    globalDebt: string
    globalDebtUtilization: string
    globalDebtCeiling: string
    surplusInTreasury: string
    marketPrice: string
    redemptionPrice: string
    annualRate: string
    eightRate: string
    pRate: string
    iRate: string
    tokenAnalyticsData: TokenAnalyticsData[]
}

const defaultState: AnalyticsContext = {
    erc20Supply: '',
    globalDebt: '',
    globalDebtUtilization: '',
    globalDebtCeiling: '',
    surplusInTreasury: '',
    marketPrice: '',
    redemptionPrice: '',
    annualRate: '',
    eightRate: '',
    pRate: '',
    iRate: '',
    tokenAnalyticsData: []
}

const AnalyticsContext = createContext<AnalyticsContext>(defaultState)

export const useAnalytics = () => useContext(AnalyticsContext)

type Props = {
    children: ReactChildren
}
export function AnalyticsProvider({ children }: Props) {
    const geb = usePublicGeb()
    const { chain } = useNetwork()

    const [data, setData] = useState(defaultState)

    useEffect(() => {
        if (!geb) return
        
        fetchAnalyticsData(geb).then((result) => {
            setData(d => ({
                ...d,
                erc20Supply: formatDataNumber(result.erc20Supply, 18, 0, true),
                globalDebt: formatDataNumber(result.globalDebt, 18, 0, true),
                globalDebtCeiling: formatDataNumber(result.globalDebtCeiling, 18, 0, true),
                globalDebtUtilization: transformToWadPercentage(result.globalDebt, result.globalDebtCeiling),
                surplusInTreasury: formatDataNumber(result.surplusInTreasury, 18, 0, true),
                marketPrice: formatDataNumber(result.marketPrice, 18, 3, true),
                redemptionPrice: formatDataNumber(result.redemptionPrice, 18, 3, true),
                annualRate: transformToAnnualRate(result.redemptionRate, 27),
                eightRate: transformToEightHourlyRate(result.redemptionRate, 27),
                pRate: transformToAnnualRate(result.redemptionRatePTerm, 27),
                iRate: transformToAnnualRate(result.redemptionRateITerm, 27),
                tokenAnalyticsData: Object.entries(result.tokenAnalyticsData)
                    .map(([key, value]) => ({
                        symbol: key,
                        ...value
                    }))
            }))
        })
    }, [geb, chain?.id])

    return (
        <AnalyticsContext.Provider value={data}>
            {children}
        </AnalyticsContext.Provider>
    )
}

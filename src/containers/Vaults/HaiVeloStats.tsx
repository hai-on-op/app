import { useMemo } from 'react'
import { useStoreActions } from '~/store'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useUnderlyingAPR } from '~/hooks/useUnderlyingAPR'
import { useEarnStrategies } from '~/hooks'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useHaiVeloStats as useHaiVeloStatsHook } from '~/hooks/haivelo/useHaiVeloStats'

import { formatNumberWithStyle } from '~/utils'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'
import { HaiButton } from '~/styles'
import { ComingSoon } from '~/components/ComingSoon'

export function HaiVeloStats() {
    const { graphSummary, graphData, data: analytics } = useAnalytics()
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)
    const { totalRewardsValue, rewardTokens, loading } = useEarnStrategies()
    const { prices: veloPrices, loading: veloLoading } = useVelodromePrices()

    const veloPriceUsd = useMemo(() => Number(veloPrices?.VELO?.raw || 0), [veloPrices])
    const { combined, isLoading: hvLoading } = useHaiVeloStatsHook(veloPriceUsd)

    const redemptionPrice = graphData?.systemStates?.[0]?.currentRedemptionPrice?.value

    const tvlFormatted = useMemo(() => {
        if (hvLoading || veloLoading) return '...'
        return formatNumberWithStyle(String(combined?.tvlUsd || 0), {
            style: 'currency',
            minDecimals: 0,
            maxDecimals: 2,
        })
    }, [combined, hvLoading, veloLoading])

    const debtCapacityFormatted = useMemo(() => {
        // Prefer haiVELO v2; fallback to v1 if v2 data is unavailable
        const v2Pct = graphSummary?.collateralStats?.['HAIVELOV2']?.debt?.ceilingPercent
        const pct = v2Pct ?? graphSummary?.collateralStats?.['HAIVELO']?.debt?.ceilingPercent
        if (pct === undefined || pct === null || isNaN(pct as any)) return '...'
        return formatNumberWithStyle(pct, { style: 'percent', suffixed: true, maxDecimals: 2 })
    }, [graphSummary])

    const { underlyingAPR, isLoading: aprLoading } = useUnderlyingAPR({ collateralType: 'HAIVELO' })

    const aprFormatted = useMemo(() => {
        const value = aprLoading ? undefined : underlyingAPR
        return value === undefined ? '...' : formatNumberWithStyle(value * 100, { style: 'percent', suffixed: true, maxDecimals: 2 })
    }, [underlyingAPR, aprLoading])

    const myRewardsHeader = useMemo(() => {
        return loading
            ? '...'
            : formatNumberWithStyle(totalRewardsValue, { style: 'currency', minDecimals: 0, maxDecimals: 2 })
    }, [totalRewardsValue, loading])

    const stats: StatProps[] = [
        {
            header: loading ? '...' : tvlFormatted,
            label: 'veVELO TVL',
        },
        {
            header: loading ? '...' : debtCapacityFormatted,
            label: 'Debt Capacity',
        },
        {
            header: aprFormatted,
            label: 'Base APR',
        },
        {
            header: myRewardsHeader,
            headerStatus: <RewardsTokenArray tokens={['HAI']} hideLabel />,
            label: 'My haiVELO Rewards',
            button: (
                <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
                    Claim
                </HaiButton>
            ),
        },
    ]

    return <Stats stats={stats} columns="repeat(3, 1fr) 1.2fr" fun />
}



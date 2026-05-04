import { useMemo } from 'react'
import { useStoreActions } from '~/store'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useEarnStrategies } from '~/hooks'
import { useAeroPrice } from '~/hooks/useAeroPrice'
import { useMinterStats } from '~/hooks/minter/useMinterStats'
import { useApr } from '~/apr/AprProvider'

import { formatNumberWithStyle } from '~/utils'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'
import { HaiButton } from '~/styles'

export function HaiAeroStats() {
    const { graphSummary } = useAnalytics()
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)
    const { totalRewardsValue, loading } = useEarnStrategies()
    const { priceUsd: aeroPriceUsd, isLoading: aeroPriceLoading } = useAeroPrice()
    const { combined, isLoading: statsLoading } = useMinterStats('haiAero', aeroPriceUsd)

    const tvlFormatted = useMemo(() => {
        if (statsLoading || aeroPriceLoading) return '...'
        return formatNumberWithStyle(String(combined?.tvlUsd ?? 0), {
            style: 'currency',
            minDecimals: 0,
            maxDecimals: 2,
        })
    }, [combined, statsLoading, aeroPriceLoading])

    const debtCapacityFormatted = useMemo(() => {
        const pct = graphSummary?.collateralStats?.['HAIAERO']?.debt?.ceilingPercent
        if (pct === undefined || pct === null || isNaN(pct as number)) return '...'
        return formatNumberWithStyle(pct, { style: 'percent', suffixed: true, maxDecimals: 2 })
    }, [graphSummary])

    const { getStrategy } = useApr()
    const haiAeroBaseApr = getStrategy('haiaero-deposit')?.boost?.baseApr || 0

    const aprFormatted = useMemo(() => {
        return formatNumberWithStyle(haiAeroBaseApr * 100, { style: 'percent', suffixed: true, maxDecimals: 2 })
    }, [haiAeroBaseApr])

    const myRewardsHeader = useMemo(() => {
        return loading
            ? '...'
            : formatNumberWithStyle(totalRewardsValue, { style: 'currency', minDecimals: 0, maxDecimals: 2 })
    }, [totalRewardsValue, loading])

    const stats: StatProps[] = [
        {
            header: loading ? '...' : tvlFormatted,
            label: 'veAERO TVL',
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
            label: 'My Claimable Rewards',
            button: (
                <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
                    Claim
                </HaiButton>
            ),
        },
    ]

    return <Stats stats={stats} columns="repeat(3, 1fr) 1.2fr" fun />
}

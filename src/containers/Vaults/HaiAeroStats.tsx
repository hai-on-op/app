import { useMemo } from 'react'
import { useStoreActions } from '~/store'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useUnderlyingAPR } from '~/hooks/useUnderlyingAPR'
import { useEarnStrategies } from '~/hooks'
import { useAeroPrice } from '~/hooks/useAeroPrice'
import { useMinterStats } from '~/hooks/minter/useMinterStats'

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

    const { underlyingAPR, isLoading: aprLoading } = useUnderlyingAPR({ collateralType: 'HAIAERO' })

    const aprFormatted = useMemo(() => {
        const value = aprLoading ? undefined : underlyingAPR
        return value === undefined
            ? '...'
            : formatNumberWithStyle(value * 100, { style: 'percent', suffixed: true, maxDecimals: 2 })
    }, [underlyingAPR, aprLoading])

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
            label: 'My haiAERO Rewards',
            button: (
                <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
                    Claim
                </HaiButton>
            ),
        },
    ]

    return <Stats stats={stats} columns="repeat(3, 1fr) 1.2fr" fun />
}

import { useMemo } from 'react'
import { useStoreActions } from '~/store'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useUnderlyingAPR } from '~/hooks/useUnderlyingAPR'
import { useEarnStrategies } from '~/hooks'

import { formatNumberWithStyle } from '~/utils'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'
import { HaiButton } from '~/styles'

export function HaiVeloStats() {
    const { graphSummary, graphData } = useAnalytics()
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)
    const { totalRewardsValue, rewardTokens, loading } = useEarnStrategies()

    const redemptionPrice = graphData?.systemStates?.[0]?.currentRedemptionPrice?.value

    const tvlFormatted = useMemo(() => {
        const total = graphSummary?.collateralStats?.['HAIVELO']?.totalCollateral?.formatted
        return total || '$0'
    }, [graphSummary])

    const debtCapacityFormatted = useMemo(() => {
        const debt = graphSummary?.collateralStats?.['HAIVELO']?.debt
        if (!debt || !redemptionPrice) return '$0'
        const remaining = (parseFloat(debt.debtCeiling || '0') - parseFloat(debt.debtAmount || '0')) * parseFloat(redemptionPrice)
        return formatNumberWithStyle(remaining.toString(), { style: 'currency', minDecimals: 0, maxDecimals: 2 })
    }, [graphSummary, redemptionPrice])

    const { underlyingAPR, isLoading: aprLoading } = useUnderlyingAPR({ collateralType: 'HAIVELO' })

    const aprFormatted = useMemo(() => {
        const value = aprLoading ? undefined : underlyingAPR
        return value === undefined ? '...' : formatNumberWithStyle(value, { style: 'percent', suffixed: true, maxDecimals: 2, scalingFactor: 1 })
    }, [underlyingAPR, aprLoading])

    const myRewardsHeader = useMemo(() => {
        return loading
            ? '...'
            : formatNumberWithStyle(totalRewardsValue, { style: 'currency', minDecimals: 0, maxDecimals: 2 })
    }, [totalRewardsValue, loading])

    const stats: StatProps[] = [
        {
            header: loading ? '...' : tvlFormatted,
            label: 'haiVELO TVL',
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



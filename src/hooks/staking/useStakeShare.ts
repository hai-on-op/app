import { useMemo } from 'react'
import type { Address } from '~/services/stakingService'
import { defaultStakingService } from '~/services/stakingService'
import { useStakeStats } from './useStakeStats'
import { useStakeEffectiveBalance } from './useStakeEffectiveBalance'
import { formatNumberWithStyle } from '~/utils'

export function useStakeShare(address?: Address, namespace: string = 'kite', service = defaultStakingService) {
    const { data: stats, isLoading: statsLoading } = useStakeStats(namespace, service)
    const { loading: effLoading, value: mine } = useStakeEffectiveBalance(address, namespace, service)
    const loading = statsLoading || effLoading
    const total = Number(stats?.totalStaked || 0)
    const value = useMemo(() => {
        if (loading) return 0
        if (!total) return 0
        return (mine / total) * 100
    }, [loading, total, mine])
    const percentage = useMemo(
        () =>
            formatNumberWithStyle(value, {
                minDecimals: 0,
                maxDecimals: 2,
                style: 'percent',
                scalingFactor: 0.01,
            }),
        [value]
    )
    return { loading, value, percentage }
}

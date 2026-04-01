import { useMemo } from 'react'
import type { StrategyAprResult } from '~/apr/types'
import { formatUsd, formatApr, formatNumber } from './utils'

import { Stats, Stat } from '~/components/Stats'
import { Section, SectionHeader } from './shared'

type Props = {
    strategies: StrategyAprResult[]
}

export function ProtocolOverview({ strategies }: Props) {
    const totals = useMemo(() => {
        const totalTvl = strategies.reduce((acc, s) => acc + s.tvl, 0)
        const totalUserPosition = strategies.reduce((acc, s) => acc + s.userPosition, 0)
        const boostEligible = strategies.filter((s) => s.boost !== null)
        const totalBoostedValue = boostEligible.reduce((acc, s) => acc + (s.boost?.totalBoostedValueParticipating || 0), 0)
        const totalDailyRewards = strategies.reduce((acc, s) => acc + (s.baseApr * s.tvl) / 365, 0)
        const strategyCount = strategies.length

        // Weighted average APR by TVL
        const weightedApr =
            totalTvl > 0
                ? strategies.reduce((acc, s) => acc + s.effectiveApr * s.tvl, 0) / totalTvl
                : 0

        return { totalTvl, totalUserPosition, totalBoostedValue, totalDailyRewards, strategyCount, weightedApr }
    }, [strategies])

    return (
        <Section>
            <SectionHeader>PROTOCOL OVERVIEW</SectionHeader>
            <Stats fun columns="repeat(6, 1fr)">
                <Stat
                    stat={{
                        header: formatUsd(totals.totalTvl),
                        label: 'Total Value Participating',
                    }}
                />
                <Stat
                    stat={{
                        header: formatUsd(totals.totalUserPosition),
                        label: 'My Total Position',
                    }}
                />
                <Stat
                    stat={{
                        header: formatApr(totals.weightedApr),
                        label: 'Avg Weighted APR',
                    }}
                />
                <Stat
                    stat={{
                        header: formatUsd(totals.totalBoostedValue),
                        label: 'Total Boosted Value',
                    }}
                />
                <Stat
                    stat={{
                        header: formatUsd(totals.totalDailyRewards),
                        label: 'Est. Daily Rewards',
                    }}
                />
                <Stat
                    stat={{
                        header: String(totals.strategyCount),
                        label: 'Active Strategies',
                    }}
                />
            </Stats>
        </Section>
    )
}

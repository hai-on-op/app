import type { RewardsReport } from './types'
import { sumStrategyTotals, formatRewardAmount, getStrategyLabel } from './utils'

import styled from 'styled-components'
import { DashedContainerStyle, type DashedContainerProps, Flex, Text } from '~/styles'
import { Stats, Stat } from '~/components/Stats'
import { Section, SectionHeader } from './index'

type Props = {
    report: RewardsReport
}

export function GlobalOverview({ report }: Props) {
    const { globalAverages, users, totalDaysWithData } = report
    const strategyTotals = sumStrategyTotals(globalAverages.avgDailyStrategyTotals)
    const tokenEntries = Object.entries(globalAverages.avgDailyRewardByToken)
    const totalStats = tokenEntries.length + 3 // tokens + users + boosted + period

    return (
        <Section>
            <SectionHeader>PROTOCOL OVERVIEW</SectionHeader>
            <Stats fun columns={`repeat(${totalStats}, 1fr)`}>
                {tokenEntries.map(([token, value]) => (
                    <Stat
                        key={token}
                        stat={{
                            header: formatRewardAmount(value),
                            label: `Avg Daily ${token} Distributed`,
                        }}
                    />
                ))}
                <Stat
                    stat={{
                        header: String(users.length),
                        label: 'Rewarded Users',
                    }}
                />
                <Stat
                    stat={{
                        header: globalAverages.avgBoostedPositions.toFixed(1),
                        label: 'Avg Boosted Positions',
                    }}
                />
                <Stat
                    stat={{
                        header: `${totalDaysWithData} days`,
                        label: 'Report Period',
                    }}
                />
            </Stats>

            <SectionHeader>STRATEGY BREAKDOWN</SectionHeader>
            <StrategyTable $borderOpacity={0.2}>
                <thead>
                    <tr>
                        <Th>Strategy</Th>
                        <Th>Token</Th>
                        <Th $align="right">Avg Daily Total</Th>
                    </tr>
                </thead>
                <tbody>
                    {strategyTotals.map((entry) => (
                        <tr key={`${entry.strategy}-${entry.token}`}>
                            <Td>{getStrategyLabel(entry.strategy)}</Td>
                            <Td>{entry.token}</Td>
                            <Td $align="right">{formatRewardAmount(entry.avgDailyTotal || 0)}</Td>
                        </tr>
                    ))}
                </tbody>
            </StrategyTable>
        </Section>
    )
}

const StrategyTable = styled.table<DashedContainerProps>`
    ${DashedContainerStyle}
    width: 100%;
    border-collapse: collapse;
    padding: 0;

    &::after {
        opacity: 0.2;
    }
`

const Th = styled.th<{ $align?: string }>`
    text-align: ${({ $align }) => $align || 'left'};
    padding: 12px 16px;
    font-size: 0.8rem;
    font-weight: 700;
    opacity: 0.6;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
`

const Td = styled.td<{ $align?: string }>`
    text-align: ${({ $align }) => $align || 'left'};
    padding: 12px 16px;
    font-size: 0.9rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
`

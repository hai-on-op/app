import type { AggregatedUser } from './types'
import { formatRewardAmount, formatShare, getStrategyLabel } from './utils'

import styled from 'styled-components'
import { DashedContainerStyle, type DashedContainerProps } from '~/styles'
import { Section, SectionHeader } from './index'

type Props = {
    user: AggregatedUser
}

type StrategyRow = {
    strategy: string
    token: string
    earned: number
    share: number
}

export function StrategyBreakdown({ user }: Props) {
    const rows: StrategyRow[] = []

    for (const [strategy, tokenMap] of Object.entries(user.avgDailyStrategyEarned)) {
        for (const [token, earned] of Object.entries(tokenMap)) {
            const share = user.avgDailyStrategyShare[strategy]?.[token] || 0
            rows.push({ strategy, token, earned, share })
        }
    }

    if (rows.length === 0) return null

    return (
        <Section>
            <SectionHeader>STRATEGY BREAKDOWN (30-DAY AVG)</SectionHeader>
            <Table $borderOpacity={0.2}>
                <thead>
                    <tr>
                        <Th>Strategy</Th>
                        <Th>Token</Th>
                        <Th $align="right">Avg Daily Earned</Th>
                        <Th $align="right">Avg Pool Share</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={`${row.strategy}-${row.token}`}>
                            <Td>{getStrategyLabel(row.strategy)}</Td>
                            <Td>{row.token}</Td>
                            <Td $align="right">
                                {formatRewardAmount(row.earned)} {row.token}
                            </Td>
                            <Td $align="right">{formatShare(row.share)}</Td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Section>
    )
}

const Table = styled.table<DashedContainerProps>`
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

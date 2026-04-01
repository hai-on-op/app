import { useMemo, useState } from 'react'
import type { StrategyAprResult } from '~/apr/types'
import {
    formatApr,
    formatUsd,
    formatBoost,
    getStrategyLabel,
    getStrategyTypeLabel,
    getBoostColor,
    getAprColor,
    sortByTvl,
    sortByApr,
} from './utils'
import { Section, SectionHeader, DataTable, Th, Td, Badge } from './shared'

import styled from 'styled-components'
import { Flex, Text } from '~/styles'

type Props = {
    strategies: StrategyAprResult[]
}

type SortKey = 'tvl' | 'apr' | 'position' | 'boost'

export function StrategyTable({ strategies }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>('tvl')

    const sorted = useMemo(() => {
        const list = [...strategies]
        switch (sortKey) {
            case 'tvl':
                return list.sort((a, b) => b.tvl - a.tvl)
            case 'apr':
                return list.sort((a, b) => b.effectiveApr - a.effectiveApr)
            case 'position':
                return list.sort((a, b) => b.userPosition - a.userPosition)
            case 'boost':
                return list.sort((a, b) => (b.boost?.myBoost || 1) - (a.boost?.myBoost || 1))
            default:
                return list
        }
    }, [strategies, sortKey])

    return (
        <Section>
            <Flex $width="100%" $justify="space-between" $align="center">
                <SectionHeader>ALL STRATEGIES</SectionHeader>
                <Flex $gap={8}>
                    {(['tvl', 'apr', 'position', 'boost'] as SortKey[]).map((key) => (
                        <SortButton key={key} $active={sortKey === key} onClick={() => setSortKey(key)}>
                            {key === 'tvl' ? 'TVP' : key === 'apr' ? 'APR' : key === 'position' ? 'Position' : 'Boost'}
                        </SortButton>
                    ))}
                </Flex>
            </Flex>
            <DataTable $borderOpacity={0.2}>
                <thead>
                    <tr>
                        <Th>Strategy</Th>
                        <Th>Type</Th>
                        <Th $align="right">TVP</Th>
                        <Th $align="right">My Position</Th>
                        <Th $align="right">Base APR</Th>
                        <Th $align="right">Boost</Th>
                        <Th $align="right">Effective APR</Th>
                        <Th $align="right">Rewards</Th>
                        <Th $align="right">Est. Daily $</Th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((strategy) => {
                        const boost = strategy.boost
                        const dailyReward = (strategy.baseApr * strategy.tvl) / 365
                        const userDailyReward = strategy.userPosition > 0
                            ? ((boost?.boostedApr ?? strategy.baseApr) * strategy.userPosition) / 365
                            : 0

                        return (
                            <tr key={strategy.id}>
                                <Td>
                                    <Flex $column $gap={2}>
                                        <Text $fontWeight={700} $fontSize="0.9rem">
                                            {getStrategyLabel(strategy.id)}
                                        </Text>
                                        <Text $fontSize="0.75rem" style={{ opacity: 0.5 }}>
                                            {strategy.pair.join(' / ')}
                                        </Text>
                                    </Flex>
                                </Td>
                                <Td>
                                    <Badge>{getStrategyTypeLabel(strategy.type)}</Badge>
                                </Td>
                                <Td $align="right">{formatUsd(strategy.tvl)}</Td>
                                <Td $align="right" $color={strategy.userPosition > 0 ? '#22d3ee' : undefined}>
                                    {strategy.userPosition > 0 ? formatUsd(strategy.userPosition) : '-'}
                                </Td>
                                <Td $align="right">{formatApr(strategy.baseApr)}</Td>
                                <Td $align="right" $color={boost && boost.myBoost > 1 ? getBoostColor(boost.myBoost) : undefined}>
                                    {boost ? formatBoost(boost.myBoost) : '-'}
                                </Td>
                                <Td $align="right" $color={getAprColor(strategy.effectiveApr)}>
                                    <Text $fontWeight={700} $fontSize="0.9rem">
                                        {formatApr(strategy.effectiveApr)}
                                    </Text>
                                </Td>
                                <Td $align="right">
                                    <Flex $column $gap={2} $align="flex-end">
                                        {strategy.rewards.map((r, i) => (
                                            <Text key={i} $fontSize="0.75rem">
                                                {r.emission > 0 ? `${r.emission} ${r.token}/day` : r.token}
                                            </Text>
                                        ))}
                                        {strategy.rewards.length === 0 && (
                                            <Text $fontSize="0.75rem" style={{ opacity: 0.4 }}>
                                                -
                                            </Text>
                                        )}
                                    </Flex>
                                </Td>
                                <Td $align="right">
                                    <Flex $column $gap={2} $align="flex-end">
                                        <Text $fontSize="0.8rem">{formatUsd(dailyReward)}</Text>
                                        {userDailyReward > 0 && (
                                            <Text $fontSize="0.7rem" $color="#22d3ee">
                                                You: {formatUsd(userDailyReward)}
                                            </Text>
                                        )}
                                    </Flex>
                                </Td>
                            </tr>
                        )
                    })}
                </tbody>
            </DataTable>
        </Section>
    )
}

const SortButton = styled.button<{ $active: boolean }>`
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, ${({ $active }) => ($active ? 0.3 : 0.1)});
    background: ${({ $active }) => ($active ? 'rgba(255, 255, 255, 0.08)' : 'transparent')};
    color: inherit;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
    }
`

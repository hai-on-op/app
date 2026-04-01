import { useMemo } from 'react'
import type { StrategyAprResult } from '~/apr/types'
import { formatBoost, formatUsd, formatApr, getStrategyLabel, getBoostColor } from './utils'
import { Section, SectionHeader, BoostBar } from './shared'

import styled from 'styled-components'
import { DashedContainerStyle, type DashedContainerProps, Flex, Text } from '~/styles'

type Props = {
    strategies: StrategyAprResult[]
}

export function BoostOverview({ strategies }: Props) {
    const boostableStrategies = useMemo(
        () => strategies.filter((s) => s.boost !== null && s.tvl > 0),
        [strategies]
    )

    if (boostableStrategies.length === 0) return null

    const totalBoostedValue = boostableStrategies.reduce(
        (acc, s) => acc + (s.boost?.myBoostedValueParticipating || 0),
        0
    )
    const totalBaseValue = boostableStrategies.reduce((acc, s) => acc + (s.boost?.myValueParticipating || 0), 0)

    return (
        <Section>
            <SectionHeader>BOOST OVERVIEW</SectionHeader>
            <Container $borderOpacity={0.2}>
                {/* Summary metrics */}
                <SummaryRow>
                    <SummaryItem>
                        <Label>Total Boostable Position</Label>
                        <Value>{formatUsd(totalBaseValue)}</Value>
                    </SummaryItem>
                    <SummaryItem>
                        <Label>Total Boosted Value</Label>
                        <Value>{formatUsd(totalBoostedValue)}</Value>
                    </SummaryItem>
                    <SummaryItem>
                        <Label>Boost Multiplier Effect</Label>
                        <Value style={{ color: totalBaseValue > 0 ? '#10b981' : 'inherit' }}>
                            {totalBaseValue > 0 ? formatBoost(totalBoostedValue / totalBaseValue) : '-'}
                        </Value>
                    </SummaryItem>
                </SummaryRow>

                {/* Per-strategy boost bars */}
                <BoostList>
                    {boostableStrategies.map((strategy) => {
                        const boost = strategy.boost!
                        const color = getBoostColor(boost.myBoost)

                        return (
                            <BoostEntry key={strategy.id}>
                                <Flex $width="100%" $justify="space-between" $align="center">
                                    <Text $fontSize="0.9rem" $fontWeight={600}>
                                        {getStrategyLabel(strategy.id)}
                                    </Text>
                                    <Flex $gap={16} $align="center">
                                        <Flex $column $align="flex-end" $gap={2}>
                                            <Text $fontSize="0.7rem" style={{ opacity: 0.5 }}>
                                                Base → Boosted
                                            </Text>
                                            <Text $fontSize="0.8rem">
                                                {formatApr(boost.baseApr)}{' '}
                                                <span style={{ color, fontWeight: 700 }}>
                                                    → {formatApr(boost.boostedApr)}
                                                </span>
                                            </Text>
                                        </Flex>
                                        <Text $fontSize="0.9rem" $fontWeight={700} style={{ color }}>
                                            {formatBoost(boost.myBoost)}
                                        </Text>
                                    </Flex>
                                </Flex>
                                <BoostBar $progress={(boost.myBoost - 1) * 100} $color={color} />
                            </BoostEntry>
                        )
                    })}
                </BoostList>
            </Container>
        </Section>
    )
}

const Container = styled.div<DashedContainerProps>`
    ${DashedContainerStyle}
    width: 100%;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;

    &::after {
        opacity: 0.2;
    }
`

const SummaryRow = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
    }
`

const SummaryItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`

const Label = styled(Text).attrs({ $fontSize: '0.75rem' })`
    opacity: 0.5;
`

const Value = styled(Text).attrs({ $fontSize: '1.2rem', $fontWeight: 700 })``

const BoostList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`

const BoostEntry = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`

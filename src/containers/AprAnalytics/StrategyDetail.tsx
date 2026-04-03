import { useState } from 'react'
import type { StrategyAprResult, PositionToken, RewardToken } from '~/apr/types'
import {
    formatApr,
    formatUsd,
    formatBoost,
    formatNumber,
    getStrategyLabel,
    getSourceLabel,
    getBoostColor,
} from './utils'
import { Section, SectionHeader, Badge, BoostBar } from './shared'

import styled, { css } from 'styled-components'
import { DashedContainerStyle, type DashedContainerProps, Flex, Text } from '~/styles'

type Props = {
    strategies: StrategyAprResult[]
}

/**
 * Build narrative explanation of *why* the APR is what it is,
 * referencing concrete token amounts, prices, and dollar values.
 */
function buildNarrative(strategy: StrategyAprResult) {
    const lines: Array<{ text: string; value: string; color?: string }> = []
    const boost = strategy.boost

    // -- Position tokens: what's in the pool --
    for (const pt of strategy.positionTokens) {
        if (pt.totalAmount > 0) {
            lines.push({
                text: `The pool holds ${formatNumber(pt.totalAmount)} ${pt.symbol} at ${formatUsd(pt.priceUsd)} each, worth`,
                value: formatUsd(pt.totalValueUsd),
            })
        }
        if (pt.userAmount > 0) {
            lines.push({
                text: `You have ${formatNumber(pt.userAmount)} ${pt.symbol}, worth`,
                value: formatUsd(pt.userValueUsd),
                color: '#22d3ee',
            })
        }
    }

    // -- Reward tokens: what's being distributed --
    for (const rt of strategy.rewardTokens) {
        if (rt.dailyEmission > 0) {
            lines.push({
                text: `${formatNumber(rt.dailyEmission)} ${rt.symbol} distributed daily at ${formatUsd(rt.priceUsd)} each, worth`,
                value: `${formatUsd(rt.dailyValueUsd)}/day (${formatUsd(rt.annualValueUsd)}/year)`,
            })
        }
    }

    // -- Per-component APR explanation --
    // For boostable strategies, APR denominator is the boost-weighted total.
    // This represents what a 1x boost user actually earns.
    const aprDenominator = boost?.totalBoostedValueParticipating && boost.totalBoostedValueParticipating > 0
        ? boost.totalBoostedValueParticipating
        : strategy.tvl
    for (const comp of strategy.components) {
        const denomLabel = boost?.totalBoostedValueParticipating && boost.totalBoostedValueParticipating > 0
            ? `${formatUsd(aprDenominator)} of boost-weighted position value`
            : `${formatUsd(aprDenominator)} of position value`

        switch (comp.source) {
            case 'redemption-rate':
                lines.push({
                    text: `The HAI redemption rate grows your purchasing power at`,
                    value: `${formatApr(comp.apr)} annually`,
                })
                break
            case 'hai-rewards':
                lines.push({
                    text: `HAI rewards spread across ${denomLabel} gives`,
                    value: `${formatApr(comp.apr)} base APR`,
                })
                if (comp.boosted) {
                    lines.push({
                        text: `This component is boostable — your KITE stake multiplies your share of this`,
                        value: '',
                        color: '#f59e0b',
                    })
                }
                break
            case 'kite-incentives':
                lines.push({
                    text: `KITE incentives spread across ${denomLabel} gives`,
                    value: `${formatApr(comp.apr)} base APR`,
                })
                if (comp.boosted) {
                    lines.push({
                        text: `This component is boostable — your KITE stake multiplies your share of this`,
                        value: '',
                        color: '#f59e0b',
                    })
                }
                break
            case 'staking-rewards':
                lines.push({
                    text: `Protocol fee rewards against ${formatUsd(strategy.tvl)} staked value yields`,
                    value: `${formatApr(comp.apr)} APR`,
                })
                break
            case 'underlying-yield':
                lines.push({
                    text: `Underlying LP yield (trading fees / auto-compound) contributes`,
                    value: `${formatApr(comp.apr)} APR`,
                })
                break
            case 'trading-fees':
                lines.push({
                    text: `Trading fees from pool activity contribute`,
                    value: `${formatApr(comp.apr)} APR`,
                })
                break
            case 'velo-emissions':
                lines.push({
                    text: `VELO gauge emissions spread across ${formatUsd(strategy.tvl)} pool TVL gives`,
                    value: `${formatApr(comp.apr)} APR`,
                })
                break
            default:
                lines.push({
                    text: `${getSourceLabel(comp.source)} contributes`,
                    value: formatApr(comp.apr),
                })
        }
    }

    // -- Combined base APR --
    if (strategy.components.length > 1) {
        lines.push({
            text: `All sources combined give a base APR of`,
            value: formatApr(strategy.baseApr),
        })
    }

    // -- Boost narrative --
    if (boost) {
        if (boost.totalBoostedValueParticipating > 0 && boost.totalBoostedValueParticipating !== strategy.tvl) {
            lines.push({
                text: `Raw TVL is ${formatUsd(strategy.tvl)}, but APR is calculated against the boost-weighted total of`,
                value: formatUsd(boost.totalBoostedValueParticipating),
            })
            lines.push({
                text: `The base APR (${formatApr(boost.baseApr)}) is what a 1x boost user earns. Higher boosts multiply your personal APR`,
                value: '',
                color: '#f59e0b',
            })
        }
        if (boost.myBoost > 1) {
            lines.push({
                text: `Your ${formatBoost(boost.myBoost)} boost (stKITE share ÷ position share + 1, max 2x) multiplies the base APR, giving you`,
                value: formatApr(boost.boostedApr),
                color: getBoostColor(boost.myBoost),
            })
        } else if (boost.myValueParticipating > 0) {
            lines.push({
                text: `No boost active — stake KITE to earn up to 2x the base APR`,
                value: '',
                color: '#f59e0b',
            })
        }
        // Max boost potential
        if (boost.myBoost > 1 && boost.myBoost < 2) {
            const boostableApr = strategy.components.filter((c) => c.boosted).reduce((s, c) => s + c.apr, 0)
            const nonBoostableApr = strategy.baseApr - boostableApr
            const maxBoostedApr = nonBoostableApr + boostableApr * 2
            const extraApr = maxBoostedApr - boost.boostedApr
            if (extraApr > 0.0001) {
                lines.push({
                    text: `At max boost (2.0x), your APR would be`,
                    value: `${formatApr(maxBoostedApr)} (+${formatApr(extraApr)})`,
                    color: '#10b981',
                })
            }
        }
    }

    // -- User estimated earnings --
    if (strategy.userPosition > 0) {
        const userApr = boost?.boostedApr ?? strategy.baseApr
        const daily = (userApr * strategy.userPosition) / 365
        lines.push({
            text: `With your ${formatUsd(strategy.userPosition)} position at ${formatApr(userApr)} effective APR, you earn approximately`,
            value: `${formatUsd(daily)}/day (${formatUsd(daily * 365)}/year)`,
            color: '#22d3ee',
        })
    }

    return lines
}

export function StrategyDetail({ strategies }: Props) {
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const withTvl = strategies.filter((s) => s.tvl > 0)

    return (
        <Section>
            <SectionHeader>APR BREAKDOWN BY STRATEGY</SectionHeader>
            {withTvl.map((strategy) => {
                const isExpanded = expandedId === strategy.id
                const boost = strategy.boost
                const narrative = isExpanded ? buildNarrative(strategy) : []

                return (
                    <DetailCard
                        key={strategy.id}
                        $borderOpacity={0.2}
                        onClick={() => setExpandedId(isExpanded ? null : strategy.id)}
                    >
                        {/* ---- Summary row ---- */}
                        <SummaryRow>
                            <Flex $gap={12} $align="center">
                                <Text $fontWeight={700} $fontSize="1rem">
                                    {getStrategyLabel(strategy.id)}
                                </Text>
                                <TypeBadge>{strategy.type}</TypeBadge>
                                {boost && boost.myBoost > 1 && (
                                    <BoostPill $color={getBoostColor(boost.myBoost)}>
                                        {formatBoost(boost.myBoost)}
                                    </BoostPill>
                                )}
                                {strategy.userPosition > 0 && (
                                    <TokenBadge $color="#22d3ee">{formatUsd(strategy.userPosition)}</TokenBadge>
                                )}
                            </Flex>
                            <Flex $gap={24} $align="center">
                                <Flex $column $align="flex-end" $gap={2}>
                                    <Text $fontSize="0.7rem" style={{ opacity: 0.4 }}>
                                        Effective APR
                                    </Text>
                                    <Text $fontWeight={700} $fontSize="1.1rem">
                                        {formatApr(strategy.effectiveApr)}
                                    </Text>
                                </Flex>
                                <CaretIcon $expanded={isExpanded}>&#9662;</CaretIcon>
                            </Flex>
                        </SummaryRow>

                        {isExpanded && (
                            <ExpandedContent onClick={(e) => e.stopPropagation()}>
                                {/* ---- Narrative ---- */}
                                <NarrativeBlock>
                                    {narrative.map((line, i) => (
                                        <NarrativeLine key={i}>
                                            <span style={line.color ? { color: line.color } : undefined}>
                                                {line.text}
                                            </span>
                                            {line.value && (
                                                <NarrativeValue style={line.color ? { color: line.color } : undefined}>
                                                    {line.value}
                                                </NarrativeValue>
                                            )}
                                        </NarrativeLine>
                                    ))}
                                </NarrativeBlock>

                                {/* ---- Position tokens table ---- */}
                                {strategy.positionTokens.length > 0 && (
                                    <StrategyBlock>
                                        <SubHeader>POSITION TOKENS</SubHeader>
                                        <MiniTable>
                                            <thead>
                                                <tr>
                                                    <MiniTh>Token</MiniTh>
                                                    <MiniTh $align="right">Price</MiniTh>
                                                    <MiniTh $align="right">Pool Amount</MiniTh>
                                                    <MiniTh $align="right">Pool Value</MiniTh>
                                                    <MiniTh $align="right">Your Amount</MiniTh>
                                                    <MiniTh $align="right">Your Value</MiniTh>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {strategy.positionTokens.map((pt, i) => (
                                                    <tr key={i}>
                                                        <MiniTd>{pt.symbol}</MiniTd>
                                                        <MiniTd $align="right">{formatUsd(pt.priceUsd)}</MiniTd>
                                                        <MiniTd $align="right">{formatNumber(pt.totalAmount)}</MiniTd>
                                                        <MiniTd $align="right">{formatUsd(pt.totalValueUsd)}</MiniTd>
                                                        <MiniTd $align="right">
                                                            {pt.userAmount > 0 ? formatNumber(pt.userAmount) : '-'}
                                                        </MiniTd>
                                                        <MiniTd $align="right">
                                                            {pt.userValueUsd > 0 ? (
                                                                <span style={{ color: '#22d3ee', fontWeight: 700 }}>
                                                                    {formatUsd(pt.userValueUsd)}
                                                                </span>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </MiniTd>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </MiniTable>
                                    </StrategyBlock>
                                )}

                                {/* ---- Reward tokens table ---- */}
                                {strategy.rewardTokens.length > 0 && (
                                    <StrategyBlock>
                                        <SubHeader>REWARD TOKENS</SubHeader>
                                        <MiniTable>
                                            <thead>
                                                <tr>
                                                    <MiniTh>Token</MiniTh>
                                                    <MiniTh $align="right">Price</MiniTh>
                                                    <MiniTh $align="right">Daily Emission</MiniTh>
                                                    <MiniTh $align="right">Daily Value</MiniTh>
                                                    <MiniTh $align="right">Annual Value</MiniTh>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {strategy.rewardTokens.map((rt, i) => (
                                                    <tr key={i}>
                                                        <MiniTd>{rt.symbol}</MiniTd>
                                                        <MiniTd $align="right">{formatUsd(rt.priceUsd)}</MiniTd>
                                                        <MiniTd $align="right">
                                                            {formatNumber(rt.dailyEmission)} {rt.symbol}
                                                        </MiniTd>
                                                        <MiniTd $align="right">{formatUsd(rt.dailyValueUsd)}</MiniTd>
                                                        <MiniTd $align="right">{formatUsd(rt.annualValueUsd)}</MiniTd>
                                                    </tr>
                                                ))}
                                                {strategy.rewardTokens.length > 1 && (
                                                    <tr>
                                                        <MiniTd>
                                                            <strong>Total</strong>
                                                        </MiniTd>
                                                        <MiniTd />
                                                        <MiniTd />
                                                        <MiniTd $align="right">
                                                            <strong>
                                                                {formatUsd(
                                                                    strategy.rewardTokens.reduce(
                                                                        (s, r) => s + r.dailyValueUsd,
                                                                        0
                                                                    )
                                                                )}
                                                            </strong>
                                                        </MiniTd>
                                                        <MiniTd $align="right">
                                                            <strong>
                                                                {formatUsd(
                                                                    strategy.rewardTokens.reduce(
                                                                        (s, r) => s + r.annualValueUsd,
                                                                        0
                                                                    )
                                                                )}
                                                            </strong>
                                                        </MiniTd>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </MiniTable>
                                    </StrategyBlock>
                                )}

                                {/* ---- APR Components ---- */}
                                <StrategyBlock>
                                    <Flex $width="100%" $justify="space-between" $align="center">
                                        <SubHeader>APR COMPONENTS</SubHeader>
                                        <Text $fontSize="0.85rem" $fontWeight={700}>
                                            Base: {formatApr(strategy.baseApr)}
                                            {boost && boost.boostedApr !== strategy.baseApr && (
                                                <span
                                                    style={{ color: getBoostColor(boost.myBoost), marginLeft: 8 }}
                                                >
                                                    Boosted: {formatApr(boost.boostedApr)}
                                                </span>
                                            )}
                                        </Text>
                                    </Flex>
                                    <MiniTable>
                                        <thead>
                                            <tr>
                                                <MiniTh>Source</MiniTh>
                                                <MiniTh $align="right">APR</MiniTh>
                                                <MiniTh $align="right">Boostable</MiniTh>
                                                <MiniTh $align="right">Annual $ / $1K</MiniTh>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {strategy.components.map((comp, i) => (
                                                <tr key={i}>
                                                    <MiniTd>{getSourceLabel(comp.source)}</MiniTd>
                                                    <MiniTd $align="right">{formatApr(comp.apr)}</MiniTd>
                                                    <MiniTd $align="right">
                                                        {comp.boosted ? (
                                                            <BoostPill $color="#10b981">Yes</BoostPill>
                                                        ) : (
                                                            <span style={{ opacity: 0.3 }}>No</span>
                                                        )}
                                                    </MiniTd>
                                                    <MiniTd $align="right">{formatUsd(comp.apr * 1000)}</MiniTd>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </MiniTable>
                                </StrategyBlock>

                                {/* ---- Unboosted vs Boosted ---- */}
                                {boost && (() => {
                                    return (
                                    <StrategyBlock>
                                        <SubHeader>POSITIONS &amp; BOOST</SubHeader>
                                        <Text $fontSize="0.8rem" style={{ opacity: 0.5 }}>
                                            Base APR ({formatApr(boost.baseApr)}) is calculated against the boost-weighted
                                            total ({formatUsd(boost.totalBoostedValueParticipating)}), representing what a 1x
                                            user earns. Your {formatBoost(boost.myBoost)} boost multiplies this to {formatApr(boost.boostedApr)}.
                                        </Text>
                                        <MiniTable>
                                            <thead>
                                                <tr>
                                                    <MiniTh></MiniTh>
                                                    <MiniTh $align="right">Total Value</MiniTh>
                                                    <MiniTh $align="right">Your Value</MiniTh>
                                                    <MiniTh $align="right">Your Share</MiniTh>
                                                    <MiniTh $align="right">APR</MiniTh>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <MiniTd>
                                                        <span style={{ opacity: 0.5 }}>Raw positions</span>
                                                    </MiniTd>
                                                    <MiniTd $align="right">
                                                        <span style={{ opacity: 0.5 }}>{formatUsd(strategy.tvl)}</span>
                                                    </MiniTd>
                                                    <MiniTd $align="right">
                                                        <span style={{ opacity: 0.5 }}>
                                                            {boost.myValueParticipating > 0
                                                                ? formatUsd(boost.myValueParticipating)
                                                                : '-'}
                                                        </span>
                                                    </MiniTd>
                                                    <MiniTd $align="right">
                                                        <span style={{ opacity: 0.5 }}>
                                                            {strategy.tvl > 0 && boost.myValueParticipating > 0
                                                                ? `${((boost.myValueParticipating / strategy.tvl) * 100).toFixed(4)}%`
                                                                : '-'}
                                                        </span>
                                                    </MiniTd>
                                                    <MiniTd $align="right">
                                                        <span style={{ opacity: 0.3 }}>—</span>
                                                    </MiniTd>
                                                </tr>
                                                <tr>
                                                    <MiniTd>
                                                        <strong>Boost-weighted (APR denominator)</strong>
                                                    </MiniTd>
                                                    <MiniTd $align="right">
                                                        <strong>{formatUsd(boost.totalBoostedValueParticipating)}</strong>
                                                    </MiniTd>
                                                    <MiniTd $align="right">
                                                        {boost.myBoostedValueParticipating > 0
                                                            ? formatUsd(boost.myBoostedValueParticipating)
                                                            : '-'}
                                                    </MiniTd>
                                                    <MiniTd $align="right">
                                                        {boost.myBoostedShare > 0
                                                            ? `${(boost.myBoostedShare * 100).toFixed(4)}%`
                                                            : '-'}
                                                    </MiniTd>
                                                    <MiniTd $align="right">
                                                        <strong>{formatApr(boost.baseApr)}</strong>
                                                    </MiniTd>
                                                </tr>
                                                {boost.myBoost > 1 && (
                                                    <tr>
                                                        <MiniTd>
                                                            <span
                                                                style={{
                                                                    color: getBoostColor(boost.myBoost),
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                Your effective ({formatBoost(boost.myBoost)})
                                                            </span>
                                                        </MiniTd>
                                                        <MiniTd $align="right">—</MiniTd>
                                                        <MiniTd $align="right">—</MiniTd>
                                                        <MiniTd $align="right">—</MiniTd>
                                                        <MiniTd $align="right">
                                                            <span
                                                                style={{
                                                                    color: getBoostColor(boost.myBoost),
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                {formatApr(boost.boostedApr)}
                                                            </span>
                                                        </MiniTd>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </MiniTable>
                                        <Flex $width="100%" $column $gap={4} style={{ marginTop: 8 }}>
                                            <Flex $width="100%" $justify="space-between">
                                                <Text $fontSize="0.75rem" style={{ opacity: 0.5 }}>
                                                    Boost: {formatBoost(boost.myBoost)} of 2.00x max
                                                </Text>
                                                <Text
                                                    $fontSize="0.75rem"
                                                    $fontWeight={700}
                                                    style={{ color: getBoostColor(boost.myBoost) }}
                                                >
                                                    {boost.myBoost >= 2
                                                        ? 'MAX BOOST'
                                                        : `+${formatApr(boost.boostedApr - boost.baseApr)} from boost`}
                                                </Text>
                                            </Flex>
                                            <BoostBar
                                                $progress={(boost.myBoost - 1) * 100}
                                                $color={getBoostColor(boost.myBoost)}
                                            />
                                        </Flex>
                                    </StrategyBlock>
                                    )
                                })()}

                                {/* ---- Footer ---- */}
                                <CardFooter>
                                    <Flex $gap={16} $align="center" style={{ flexWrap: 'wrap' }}>
                                        <FooterStat>
                                            <span style={{ opacity: 0.5 }}>Pool daily rewards:</span>{' '}
                                            <strong>
                                                {formatUsd(
                                                    strategy.rewardTokens.reduce((s, r) => s + r.dailyValueUsd, 0)
                                                )}
                                            </strong>
                                        </FooterStat>
                                        {strategy.userPosition > 0 && (
                                            <>
                                                <FooterStat>
                                                    <span style={{ opacity: 0.5 }}>Your daily:</span>{' '}
                                                    <strong style={{ color: '#22d3ee' }}>
                                                        {formatUsd(
                                                            ((boost?.boostedApr ?? strategy.baseApr) *
                                                                strategy.userPosition) /
                                                                365
                                                        )}
                                                    </strong>
                                                </FooterStat>
                                                <FooterStat>
                                                    <span style={{ opacity: 0.5 }}>Your annual:</span>{' '}
                                                    <strong style={{ color: '#22d3ee' }}>
                                                        {formatUsd(
                                                            (boost?.boostedApr ?? strategy.baseApr) *
                                                                strategy.userPosition
                                                        )}
                                                    </strong>
                                                </FooterStat>
                                            </>
                                        )}
                                    </Flex>
                                    {boost && (
                                        <BoostPill $color={getBoostColor(boost.myBoost)}>
                                            Boost: {formatBoost(boost.myBoost)}
                                        </BoostPill>
                                    )}
                                </CardFooter>
                            </ExpandedContent>
                        )}
                    </DetailCard>
                )
            })}
        </Section>
    )
}

// ================= Styled components =================

const DetailCard = styled.div<DashedContainerProps>`
    ${DashedContainerStyle}
    width: 100%;
    cursor: pointer;
    overflow: hidden;
    transition: background 0.2s;
    &:hover {
        background: rgba(255, 255, 255, 0.02);
    }
    &::after {
        opacity: 0.2;
    }
`
const SummaryRow = styled(Flex).attrs({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
})`
    padding: 16px 24px;
    flex-wrap: wrap;
`
const CaretIcon = styled.span<{ $expanded: boolean }>`
    font-size: 1.2rem;
    transition: transform 0.3s ease;
    transform: rotate(${({ $expanded }) => ($expanded ? '180deg' : '0deg')});
    opacity: 0.5;
`
const ExpandedContent = styled(Flex).attrs({ $width: '100%', $column: true, $gap: 16 })`
    padding: 0 24px 24px;
`
const NarrativeBlock = styled(Flex).attrs({ $width: '100%', $column: true, $gap: 4 })``
const NarrativeLine = styled(Flex).attrs({
    $width: '100%',
    $justify: 'space-between',
    $align: 'baseline',
    $gap: 12,
})`
    font-size: 0.85rem;
    flex-wrap: wrap;
`
const NarrativeValue = styled.span`
    font-weight: 700;
    white-space: nowrap;
`
const StrategyBlock = styled(Flex).attrs({ $width: '100%', $column: true, $gap: 8 })`
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
`
const SubHeader = styled(Text).attrs({ $fontSize: '0.8rem', $fontWeight: 700 })`
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 0.05em;
`
const MiniTable = styled.table`
    width: 100%;
    border-collapse: collapse;
`
const MiniTh = styled.th<{ $align?: string }>`
    text-align: ${({ $align }) => $align || 'left'};
    padding: 6px 8px;
    font-size: 0.75rem;
    font-weight: 700;
    opacity: 0.5;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`
const MiniTd = styled.td<{ $align?: string }>`
    text-align: ${({ $align }) => $align || 'left'};
    padding: 6px 8px;
    font-size: 0.8rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
`
const TypeBadge = styled(Badge)`
    text-transform: capitalize;
`
const TokenBadge = styled.span<{ $color: string }>`
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
    background: ${({ $color }) => $color}18;
    color: ${({ $color }) => $color};
`
const BoostPill = styled.span<{ $color: string }>`
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    white-space: nowrap;
    ${({ $color }) => css`
        background: ${$color}22;
        color: ${$color};
    `}
`
const CardFooter = styled(Flex).attrs({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
})`
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    flex-wrap: wrap;
`
const FooterStat = styled(Text).attrs({ $fontSize: '0.8rem' })``

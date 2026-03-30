import type { DailyReport, DailyUserData } from './types'
import {
    formatRewardAmount,
    formatShare,
    formatBoost,
    getBoostColor,
    getTokenColor,
    calcUserShare,
    calcMaxBoostPotential,
    getStrategyPoolTotal,
    getStrategyLabel,
    getPositionLabel,
    BOOST_KEY_LABELS,
} from './utils'

import styled, { css } from 'styled-components'
import { DashedContainerStyle, type DashedContainerProps, Flex, Text } from '~/styles'
import { Caret } from '~/components/Icons/Caret'

type Props = {
    dayReport: DailyReport
    userData: DailyUserData
    expanded: boolean
    onToggle: () => void
}

export function DailyDetailCard({ dayReport, userData, expanded, onToggle }: Props) {
    const tokens = Object.keys(dayReport.totalRewardByToken)
    const strategies = Object.entries(userData.dailyStrategyEarned)
    const boostEntries = Object.entries(userData.boosts).filter(([, v]) => v > 0)
    const hasEarnings = Object.values(userData.dailyEarned).some((v) => v > 0)

    return (
        <CardContainer $borderOpacity={0.2} $expanded={expanded}>
            {/* Clickable summary row — always visible */}
            <SummaryRow onClick={onToggle}>
                <Flex $gap={12} $align="center">
                    <Text $fontWeight={700} $fontSize="1rem">
                        {dayReport.date}
                    </Text>
                    {hasEarnings && (
                        <Flex $gap={8} $align="center">
                            {Object.entries(userData.dailyEarned)
                                .filter(([, v]) => v > 0)
                                .map(([token, value]) => (
                                    <TokenBadge key={token} $color={getTokenColor(token)}>
                                        {formatRewardAmount(value)} {token}
                                    </TokenBadge>
                                ))}
                        </Flex>
                    )}
                    {!hasEarnings && (
                        <Text $fontSize="0.85rem" style={{ opacity: 0.4 }}>
                            No rewards
                        </Text>
                    )}
                </Flex>
                <Flex $gap={8} $align="center">
                    {userData.hasBoostedPosition && <BoostedBadge>BOOSTED</BoostedBadge>}
                    <CaretWrapper $expanded={expanded}>
                        <Caret direction="down" />
                    </CaretWrapper>
                </Flex>
            </SummaryRow>

            {/* Expanded detail — hidden when collapsed */}
            {expanded && (
                <ExpandedContent>
                    {/* Narrative Summary */}
                    {!hasEarnings ? (
                        <Text $fontSize="0.9rem" style={{ opacity: 0.5 }}>
                            No rewards earned this day.
                        </Text>
                    ) : (
                        <NarrativeBlock>
                            {tokens.map((token) => {
                                const earned = userData.dailyEarned[token] || 0
                                const poolTotal = dayReport.totalRewardByToken[token] || 0
                                if (earned === 0 && poolTotal === 0) return null
                                const share = calcUserShare(earned, poolTotal)
                                return (
                                    <NarrativeLine key={token}>
                                        <span>
                                            Out of {formatRewardAmount(poolTotal)} {token} distributed, you earned
                                        </span>
                                        <NarrativeValue>
                                            {formatRewardAmount(earned)} {token} ({formatShare(share)})
                                        </NarrativeValue>
                                    </NarrativeLine>
                                )
                            })}

                            {strategies.map(([strategy, tokenMap]) =>
                                Object.entries(tokenMap).map(([token, earned]) => {
                                    if (earned === 0) return null
                                    const pos = userData.strategyPositions?.[strategy]?.[token]
                                    const poolTotal = getStrategyPoolTotal(
                                        dayReport.strategyTotals,
                                        strategy,
                                        token
                                    )
                                    const share = calcUserShare(earned, poolTotal)

                                    const posLabel = getPositionLabel(strategy)
                                    const delayedText = pos?.isDelayed ? ' ~7 days ago' : ''

                                    return (
                                        <NarrativeLine key={`${strategy}-${token}`}>
                                            <span>
                                                In {getStrategyLabel(strategy)}
                                                {pos && pos.avgPosition > 0
                                                    ? <>
                                                        {`, your avg ${posLabel}${delayedText} of `}
                                                        {formatRewardAmount(pos.avgPosition)}
                                                        {` (${formatShare(share)} of pool`}
                                                        {pos.endOfDayBoost > 1 &&
                                                            `, ${formatBoost(pos.endOfDayBoost)} boost`}
                                                        {') earned you'}
                                                    </>
                                                    : ', you earned'
                                                }
                                            </span>
                                            <NarrativeValue>
                                                {formatRewardAmount(earned)} {token}
                                            </NarrativeValue>
                                        </NarrativeLine>
                                    )
                                })
                            )}

                            {/* Max boost potential lines */}
                            {strategies.map(([strategy, tokenMap]) =>
                                Object.entries(tokenMap).map(([token, earned]) => {
                                    const pos = userData.strategyPositions?.[strategy]?.[token]
                                    if (!pos || pos.endOfDayBoost >= 2.0 || earned === 0) return null
                                    const poolTotal = getStrategyPoolTotal(
                                        dayReport.strategyTotals,
                                        strategy,
                                        token
                                    )
                                    const result = calcMaxBoostPotential(pos, poolTotal, earned)
                                    if (!result || result.extraEarned < 0.0001) return null
                                    return (
                                        <NarrativeLine key={`max-${strategy}-${token}`}>
                                            <span style={{ color: '#10b981' }}>
                                                At max boost (2.0x) in {getStrategyLabel(strategy)}
                                            </span>
                                            <NarrativeValue style={{ color: '#10b981' }}>
                                                +{formatRewardAmount(result.extraEarned)} {token} (+
                                                {(result.pctIncrease * 100).toFixed(1)}%)
                                            </NarrativeValue>
                                        </NarrativeLine>
                                    )
                                })
                            )}
                        </NarrativeBlock>
                    )}

                    {/* Token Summary Table */}
                    {hasEarnings && (
                        <MiniTable>
                            <thead>
                                <tr>
                                    <MiniTh>Token</MiniTh>
                                    <MiniTh $align="right">Pool Total</MiniTh>
                                    <MiniTh $align="right">You Earned</MiniTh>
                                    <MiniTh $align="right">Your Share</MiniTh>
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map((token) => {
                                    const earned = userData.dailyEarned[token] || 0
                                    const poolTotal = dayReport.totalRewardByToken[token] || 0
                                    return (
                                        <tr key={token}>
                                            <MiniTd>{token}</MiniTd>
                                            <MiniTd $align="right">{formatRewardAmount(poolTotal)}</MiniTd>
                                            <MiniTd $align="right">{formatRewardAmount(earned)}</MiniTd>
                                            <MiniTd $align="right">
                                                {formatShare(calcUserShare(earned, poolTotal))}
                                            </MiniTd>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </MiniTable>
                    )}

                    {/* Strategy Blocks */}
                    {hasEarnings &&
                        strategies.map(([strategy, tokenMap]) =>
                            Object.entries(tokenMap).map(([token, earned]) => {
                                if (earned === 0) return null
                                const pos = userData.strategyPositions?.[strategy]?.[token]
                                const poolTotal = getStrategyPoolTotal(
                                    dayReport.strategyTotals,
                                    strategy,
                                    token
                                )
                                const share = calcUserShare(earned, poolTotal)
                                const maxBoost =
                                    pos && pos.endOfDayBoost < 2.0
                                        ? calcMaxBoostPotential(pos, poolTotal, earned)
                                        : null

                                return (
                                    <StrategyBlock key={`${strategy}-${token}`}>
                                        <Flex
                                            $width="100%"
                                            $justify="space-between"
                                            $align="center"
                                            $flexWrap
                                            $gap={8}
                                        >
                                            <Text $fontWeight={700} $fontSize="0.95rem">
                                                {getStrategyLabel(strategy)} — {token}
                                            </Text>
                                            <Flex $gap={8} $align="center">
                                                <Text $fontSize="0.85rem">
                                                    Pool: {formatRewardAmount(poolTotal)} | Earned:{' '}
                                                    {formatRewardAmount(earned)} [{formatShare(share)}]
                                                </Text>
                                                {pos && pos.endOfDayBoost > 1 && (
                                                    <BoostPill $color={getBoostColor(pos.endOfDayBoost)}>
                                                        {formatBoost(pos.endOfDayBoost)}
                                                    </BoostPill>
                                                )}
                                            </Flex>
                                        </Flex>

                                        {pos && earned > 0 && pos.avgPosition > 0 && (() => {
                                            const posLabel = getPositionLabel(strategy)
                                            const totalLabel = `Total ${posLabel}`
                                            const yourLabel = `Your avg ${posLabel}`
                                            // Unboosted: raw position values
                                            const unboostedTotal = pos.avgTotalPosition
                                            const unboostedUser = pos.avgPosition
                                            const unboostedShare = unboostedTotal > 0 ? unboostedUser / unboostedTotal : 0
                                            // Boosted: position * boost
                                            const boost = pos.endOfDayBoost || 1
                                            const boostedUser = pos.avgPosition * boost
                                            // Total boosted = scale total by (avgTotalWeight / avgTotalUnboostedWeight)
                                            const boostRatio = pos.avgTotalUnboostedWeight > 0
                                                ? pos.avgTotalWeight / pos.avgTotalUnboostedWeight
                                                : 1
                                            const boostedTotal = pos.avgTotalPosition * boostRatio
                                            const boostedShare = pos.avgTotalWeight > 0
                                                ? pos.avgWeight / pos.avgTotalWeight
                                                : 0
                                            return (
                                                <MiniTable>
                                                    <thead>
                                                        <tr>
                                                            <MiniTh></MiniTh>
                                                            <MiniTh $align="right">{totalLabel}</MiniTh>
                                                            <MiniTh $align="right">{yourLabel}</MiniTh>
                                                            <MiniTh $align="right">Your Share</MiniTh>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <MiniTd>Unboosted</MiniTd>
                                                            <MiniTd $align="right">
                                                                {formatRewardAmount(unboostedTotal)}
                                                            </MiniTd>
                                                            <MiniTd $align="right">
                                                                {formatRewardAmount(unboostedUser)}
                                                            </MiniTd>
                                                            <MiniTd $align="right">
                                                                {formatShare(unboostedShare)}
                                                            </MiniTd>
                                                        </tr>
                                                        <tr>
                                                            <MiniTd>Boosted</MiniTd>
                                                            <MiniTd $align="right">
                                                                {formatRewardAmount(boostedTotal)}
                                                            </MiniTd>
                                                            <MiniTd $align="right">
                                                                {formatRewardAmount(boostedUser)}
                                                            </MiniTd>
                                                            <MiniTd $align="right">
                                                                {formatShare(boostedShare)}
                                                            </MiniTd>
                                                        </tr>
                                                    </tbody>
                                                </MiniTable>
                                            )
                                        })()}

                                        {pos && pos.isDelayed && (
                                            <Text $fontSize="0.75rem" $color="#f59e0b">
                                                Based on your position from ~7 days ago
                                            </Text>
                                        )}

                                        {maxBoost && maxBoost.extraEarned >= 0.0001 && (
                                            <Text $fontSize="0.85rem" $color="#10b981">
                                                At max boost (2.0x): +
                                                {formatRewardAmount(maxBoost.extraEarned)} {token} (+
                                                {(maxBoost.pctIncrease * 100).toFixed(1)}% more) ={' '}
                                                {formatRewardAmount(maxBoost.maxEarned)} total
                                            </Text>
                                        )}
                                        {pos && pos.endOfDayBoost >= 2.0 && (
                                            <Text $fontSize="0.85rem" $color="#10b981" $fontWeight={700}>
                                                Already at max boost
                                            </Text>
                                        )}
                                    </StrategyBlock>
                                )
                            })
                        )}

                    {/* Footer: boost pills + KITE info */}
                    <CardFooter>
                        <Flex $gap={6} $flexWrap $align="center">
                            {boostEntries.map(([key, value]) => (
                                <BoostPill key={key} $color={getBoostColor(value)}>
                                    {BOOST_KEY_LABELS[key] || key}: {formatBoost(value)}
                                </BoostPill>
                            ))}
                        </Flex>
                        <Flex $gap={16} $align="center" $flexWrap>
                            <Text $fontSize="0.8rem">
                                <span style={{ opacity: 0.6 }}>KITE Staked:</span>{' '}
                                <strong>{formatRewardAmount(userData.kiteStaked)}</strong>
                            </Text>
                            <Text $fontSize="0.8rem">
                                <span style={{ opacity: 0.6 }}>KITE Share:</span>{' '}
                                <strong>{formatShare(userData.kiteShare)}</strong>
                            </Text>
                        </Flex>
                    </CardFooter>
                </ExpandedContent>
            )}
        </CardContainer>
    )
}

const CardContainer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $gap: 0,
    ...props,
}))<DashedContainerProps & { $expanded?: boolean }>`
    ${DashedContainerStyle}
    overflow: hidden;

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
    cursor: pointer;
    user-select: none;
    flex-wrap: wrap;

    &:hover {
        background: rgba(0, 0, 0, 0.02);
    }
`

const CaretWrapper = styled.div<{ $expanded: boolean }>`
    transition: transform 0.3s ease;
    transform: ${({ $expanded }) => ($expanded ? 'rotate(180deg)' : 'rotate(0deg)')};
    display: flex;
    align-items: center;
`

const ExpandedContent = styled(Flex).attrs({
    $width: '100%',
    $column: true,
    $gap: 16,
})`
    padding: 0 24px 24px;
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

const BoostedBadge = styled.span`
    padding: 2px 10px;
    border-radius: 999px;
    background: #10b98122;
    color: #10b981;
    font-size: 0.7rem;
    font-weight: 700;
`

const NarrativeBlock = styled(Flex).attrs({
    $width: '100%',
    $column: true,
    $gap: 4,
})``

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

const StrategyBlock = styled(Flex).attrs({
    $width: '100%',
    $column: true,
    $gap: 8,
})`
    padding-top: 12px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
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
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    flex-wrap: wrap;
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
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
`

const MiniTd = styled.td<{ $align?: string }>`
    text-align: ${({ $align }) => $align || 'left'};
    padding: 6px 8px;
    font-size: 0.8rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
`

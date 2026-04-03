import { useMemo } from 'react'
// import { useTranslation } from 'react-i18next'
// import { formatCollateralLabel } from '~/utils'
import { Status, formatNumberWithStyle } from '~/utils'
// import { useStoreState } from '~/store'
// import { useVault } from '~/providers/VaultProvider'
// import { useEarnStrategies } from '~/hooks'
// import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useStakingSummaryV2 } from '~/hooks/staking/useStakingSummaryV2'
import { useLpTvl } from '~/hooks/staking/useLpTvl'
import { useApr } from '~/apr/AprProvider'
import { Loader } from '~/components/Loader'
// import { ComingSoon } from '~/components/ComingSoon'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text, CenteredFlex } from '~/styles'
import { Swirl } from '~/components/Icons/Swirl'
import { StatusLabel } from '~/components/StatusLabel'
import { OverviewProgressStat, OverviewStat } from './OverviewStat'
// import { AlertTriangle, ArrowLeft, ArrowRight } from 'react-feather'
// import { useBoost } from '~/hooks/useBoost'
// import { BigNumber, utils } from 'ethers'
import { useAccount } from 'wagmi'
import { ExternalLink } from 'react-feather'
import { TOKEN_LOGOS } from '~/utils/tokens'
import type { TokenKey } from '~/types'
import type { StakingConfig } from '~/types/stakingConfig'

type StakingSimulation = {
    stakingAmount: string
    unstakingAmount: string
    setStakingAmount: (amount: string) => void
    setUnstakingAmount: (amount: string) => void
}

type OverviewProps = {
    simulation: StakingSimulation
    config?: StakingConfig
}

export function Overview({ simulation, config }: OverviewProps) {
    const { stakingAmount, unstakingAmount } = simulation
    const { address } = useAccount()
    // const useNew = true

    const tokenLabel = config?.labels.token || 'KITE'
    const stTokenLabel = config?.labels.stToken || 'stKITE'
    const tokenKey: TokenKey | undefined = (TOKEN_LOGOS as Record<string, unknown>)[tokenLabel]
        ? (tokenLabel as TokenKey)
        : undefined

    const {
        loading,
        kitePrice,
        totalStaked,
        myStaked,
        myShare,
        stakingApr,
        aprBreakdown,
        boost,
        calculateSimulatedValues,
        isOptimistic,
    } = useStakingSummaryV2(address as any, config as any)

    const { loading: lpTvlLoading, tvlUsdFormatted } = useLpTvl(config)

    // Read APR from AprProvider for consistency with /earn and /apr pages
    const { getStrategy } = useApr()
    const aprStrategyId = config?.namespace === 'lp-hai-bold-curve'
        ? 'haibold-curve-lp'
        : config?.namespace === 'lp-hai-velo-velo'
        ? 'haivelo-velo-lp'
        : 'kite-staking'
    const aprStrategy = getStrategy(aprStrategyId)

    // Override stakingApr AND aprBreakdown with AprProvider values for consistency
    const effectiveStakingApr = useMemo(() => {
        if (!aprStrategy) return stakingApr
        const effectiveApr = aprStrategy.boost?.boostedApr ?? aprStrategy.baseApr
        return {
            ...stakingApr,
            value: effectiveApr,
            formatted: formatNumberWithStyle(effectiveApr * 100, {
                style: 'percent',
                maxDecimals: 1,
                suffixed: true,
            }),
        }
    }, [aprStrategy, stakingApr])

    const effectiveAprBreakdown = useMemo(() => {
        if (!aprStrategy || !aprBreakdown) return aprBreakdown
        const comps = aprStrategy.components
        const underlying = comps.find((c) => c.source === 'underlying-yield' || c.source === 'trading-fees')
        const haiRewards = comps.find((c) => c.source === 'hai-rewards')
        const incentives = comps.find((c) => c.source === 'kite-incentives')
        const boost = aprStrategy.boost
        const myBoost = boost?.myBoost ?? 1
        const incentivesApr = incentives?.apr ?? 0
        const boostedIncentivesApr = incentivesApr * myBoost
        const netApr = (underlying?.apr ?? 0) + (haiRewards?.apr ?? 0) + incentivesApr
        const boostedNetApr = (underlying?.apr ?? 0) + (haiRewards?.apr ?? 0) + boostedIncentivesApr
        const fmt = (v: number) => formatNumberWithStyle(v * 100, { style: 'percent', maxDecimals: 2, suffixed: true })
        return {
            ...aprBreakdown,
            underlyingApr: underlying?.apr ?? 0,
            underlyingAprFormatted: fmt(underlying?.apr ?? 0),
            haiRewardsApr: haiRewards?.apr ?? 0,
            haiRewardsAprFormatted: fmt(haiRewards?.apr ?? 0),
            incentivesApr: incentivesApr,
            incentivesAprFormatted: fmt(incentivesApr),
            netApr,
            netAprFormatted: fmt(netApr),
            boost: myBoost,
            boostFormatted: `${myBoost.toFixed(2)}x`,
            boostedNetApr,
            boostedNetAprFormatted: fmt(boostedNetApr),
        }
    }, [aprStrategy, aprBreakdown])

    // Calculate simulated values if simulation values are provided
    const simValues = useMemo(
        () => calculateSimulatedValues(stakingAmount, unstakingAmount),
        [stakingAmount, unstakingAmount, calculateSimulatedValues]
    )

    const isKitePool = !config || config.namespace === 'kite'
    const isCurveLp = config?.tvl?.source === 'curve'
    const isVelodromeLp = config?.tvl?.source === 'velodrome'
    const isLpPool = isCurveLp || isVelodromeLp
    const showLpTvl = Boolean(config?.tvl)
    const lpTvlLabel = config?.tvl?.label || (config?.tvl?.source === 'curve' ? 'Curve LP TVL' : 'haiVELO/VELO LP TVL')

    // Dynamic descriptions based on pool type
    const bd = effectiveAprBreakdown
    const underlyingLabel = bd?.underlyingLabel || 'Underlying LP APY'
    const underlyingDescription = isCurveLp
        ? 'Trading fees from the Curve pool'
        : isVelodromeLp
        ? 'Trading fees from the Velodrome pool'
        : 'Underlying pool yield'

    // Tooltip content for LP staking APR breakdown
    const hasBoost = bd && bd.boost > 1
    const boostedIncentivesFormatted = bd
        ? formatNumberWithStyle((bd.incentivesApr * bd.boost) * 100, { style: 'percent', maxDecimals: 2, suffixed: true })
        : ''
    const lpAprBreakdownTooltip = bd ? (
        <div style={{ width: '100%' }}>
            <div style={{ marginBottom: '8px' }}>
                <Text $fontSize=".9rem" $fontWeight={700}>
                    {underlyingLabel}
                </Text>
                <Text $fontSize=".9rem">{bd.underlyingAprFormatted}</Text>
                <Text $fontSize=".75rem" style={{ opacity: 0.7 }}>
                    {underlyingDescription}
                </Text>
            </div>
            {/* HAI Rewards - only for Velodrome pools */}
            {isVelodromeLp && bd.haiRewardsApr > 0 && (
                <div style={{ marginBottom: '8px' }}>
                    <Text $fontSize=".9rem" $fontWeight={700}>
                        HAI Rewards APR
                    </Text>
                    <Text $fontSize=".9rem">{bd.haiRewardsAprFormatted}</Text>
                    <Text $fontSize=".75rem" style={{ opacity: 0.7 }}>
                        Shared with haiVELO depositors
                    </Text>
                </div>
            )}
            <div style={{ marginBottom: '8px' }}>
                <Text $fontSize=".9rem" $fontWeight={700}>
                    KITE Incentives APR
                </Text>
                <Text $fontSize=".9rem">{bd.incentivesAprFormatted}</Text>
                <Text $fontSize=".75rem" style={{ opacity: 0.7 }}>
                    25 KITE/day distributed to stakers
                </Text>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px', marginTop: '8px' }}>
                <Text $fontSize=".9rem" $fontWeight={700}>
                    Base Net APR
                </Text>
                <Text $fontSize=".9rem">{bd.netAprFormatted}</Text>
            </div>
            {/* Boost breakdown - show boost multiplier and boosted APR */}
            <div style={{ marginTop: '8px' }}>
                <Text $fontSize=".9rem" $fontWeight={700}>
                    My Boost
                </Text>
                <Text $fontSize=".9rem">{bd.boostFormatted}</Text>
                <Text $fontSize=".75rem" style={{ opacity: 0.7 }}>
                    Based on your stKITE share / staked LP share ratio
                </Text>
            </div>
            {hasBoost && (
                <div style={{ marginTop: '8px' }}>
                    <Text $fontSize=".9rem" $fontWeight={700}>
                        Boosted KITE Incentives
                    </Text>
                    <Text $fontSize=".9rem">{boostedIncentivesFormatted}</Text>
                    <Text $fontSize=".75rem" style={{ opacity: 0.7 }}>
                        {bd.incentivesAprFormatted} × {bd.boostFormatted}
                    </Text>
                </div>
            )}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px', marginTop: '8px' }}>
                <Text $fontSize=".9rem" $fontWeight={700}>
                    Boosted Net APR
                </Text>
                <Text $fontSize="1rem" $fontWeight={700} style={{ color: hasBoost ? '#00AC11' : undefined }}>
                    {bd.boostedNetAprFormatted}
                </Text>
                {hasBoost && (
                    <Text $fontSize=".75rem" style={{ opacity: 0.7 }}>
                        {bd.underlyingAprFormatted} + {boostedIncentivesFormatted}
                    </Text>
                )}
            </div>
        </div>
    ) : null

    // Tooltip content for boosted value (KITE only)
    const myBoostedValueToolTip = (
        <div style={{ width: '100%' }}>
            <div style={{ marginBottom: '10px' }}>
                <Text $fontSize=".9rem" $fontWeight={700}>
                    haiVELO
                </Text>
                <Text $fontSize=".9rem">
                    {formatNumberWithStyle(boost.haiVeloPositionValue, {
                        minDecimals: 2,
                        maxDecimals: 2,
                        style: 'currency',
                    })}{' '}
                    +{' '}
                    {formatNumberWithStyle(boost.haiVeloBoost, {
                        minDecimals: 0,
                        maxDecimals: 2,
                    })}
                    x Boost
                </Text>
            </div>
            <div>
                <Text $fontSize=".9rem" $fontWeight={700}>
                    HAI Minted
                </Text>
                <Text $fontSize=".9rem">
                    {formatNumberWithStyle(boost.haiMintingPositionValue, {
                        minDecimals: 2,
                        maxDecimals: 2,
                        style: 'currency',
                    })}{' '}
                    +{' '}
                    {formatNumberWithStyle(boost.haiMintingBoost, {
                        minDecimals: 0,
                        maxDecimals: 2,
                    })}
                    x Boost
                </Text>
            </div>
        </div>
    )

    return (
        <Container>
            <Header>
                <Flex $justify="flex-start" $align="center" $gap={12}>
                    <Text $fontWeight={700}>Staking Overview</Text>
                    {simValues.simulationMode && (
                        <StatusLabel status={Status.CUSTOM} background="gradient">
                            <CenteredFlex $gap={8}>
                                <Swirl size={14} />
                                <Text $fontSize="0.67rem" $fontWeight={700}>
                                    Simulation
                                </Text>
                            </CenteredFlex>
                        </StatusLabel>
                    )}
                    {isOptimistic && (
                        <StatusLabel status={Status.POSITIVE}>
                            <CenteredFlex $gap={8}>
                                <Loader size={16} hideSpinner={false} color="#00AC11"></Loader>
                                <Text $fontSize="0.67rem" $fontWeight={700}>
                                    Confirming Transaction
                                </Text>
                            </CenteredFlex>
                        </StatusLabel>
                    )}
                </Flex>

                {config?.affectsBoost !== false && isKitePool && (
                    <Flex $justify="flex-end" $align="center" $gap={12} $fontSize="0.8em">
                        <Text>
                            {tokenLabel}: &nbsp;
                            <strong>
                                {formatNumberWithStyle(kitePrice, {
                                    minDecimals: 2,
                                    maxDecimals: 2,
                                    style: 'currency',
                                })}
                            </strong>
                        </Text>
                    </Flex>
                )}

                {isCurveLp && (
                    <GetLpButton
                        href="https://www.curve.finance/dex/optimism/pools/factory-stable-ng-81/deposit"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Get {tokenLabel}
                        <ExternalLink size={14} />
                    </GetLpButton>
                )}
            </Header>
            <Inner $borderOpacity={0.2}>
                <OverviewStat
                    loading={loading}
                    value={totalStaked.amountFormatted}
                    token={tokenKey}
                    tokenLabel={stTokenLabel}
                    simulatedToken={stTokenLabel}
                    label={`Total Staked ${tokenLabel}`}
                    convertedValue={totalStaked.usdValueFormatted}
                    simulatedValue={
                        simValues.totalStakedAfterTx !== totalStaked.amount
                            ? formatNumberWithStyle(simValues.totalStakedAfterTx, {
                                  minDecimals: 0,
                                  maxDecimals: 2,
                              })
                            : undefined
                    }
                    labelOnTop
                />
                <OverviewStat
                    loading={loading}
                    value={myStaked.effectiveAmountFormatted}
                    token={tokenKey}
                    tokenLabel={stTokenLabel}
                    simulatedToken={stTokenLabel}
                    label={`My Staked ${tokenLabel}`}
                    convertedValue={myStaked.usdValueFormatted}
                    simulatedValue={
                        simValues.myStakedAfterTx !== myStaked.effectiveAmount
                            ? formatNumberWithStyle(simValues.myStakedAfterTx, {
                                  minDecimals: 0,
                                  maxDecimals: 2,
                              })
                            : undefined
                    }
                    labelOnTop
                />
                <OverviewStat
                    loading={loading}
                    value={`${formatNumberWithStyle(myShare.value, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}%`}
                    label={`My ${stTokenLabel} Share`}
                    simulatedValue={
                        simValues.myShareAfterTx !== myShare.value
                            ? `${formatNumberWithStyle(simValues.myShareAfterTx, {
                                  minDecimals: 0,
                                  maxDecimals: 2,
                              })}%`
                            : undefined
                    }
                />
                {showLpTvl && (
                    <OverviewStat
                        loading={loading || lpTvlLoading}
                        value={tvlUsdFormatted}
                        label={lpTvlLabel}
                        tooltip={
                            <Text>
                                Total value locked in the underlying {config?.labels.token || 'LP'} pool. This reflects
                                the combined value of all liquidity provider tokens in the pool.
                            </Text>
                        }
                    />
                )}
                <OverviewStat
                    isComingSoon={false}
                    loading={loading}
                    value={
                        aprStrategy?.boost && aprStrategy.boost.myBoost > 1 && isLpPool ? (
                            <Flex $gap={8} $align="center">
                                <Text $fontWeight={700} style={{ textDecoration: 'line-through', opacity: 0.5 }}>
                                    {formatNumberWithStyle(aprStrategy.baseApr * 100, { style: 'percent', maxDecimals: 1, suffixed: true })}
                                </Text>
                                <Text $fontWeight={700} style={{ color: '#00ac11' }}>
                                    {effectiveStakingApr.formatted}
                                </Text>
                            </Flex>
                        ) : effectiveStakingApr.formatted
                    }
                    label={isLpPool ? 'Net APR' : 'Staking APR'}
                    tooltip={
                        isLpPool && lpAprBreakdownTooltip
                            ? lpAprBreakdownTooltip
                            : `The base staking APR is determined by protocol fees accrued in system surplus and the stream rate set by the DAO.`
                    }
                />
                {config?.affectsBoost !== false && (
                    <>
                        {isKitePool && (
                            <OverviewStat
                                isComingSoon={false}
                                loading={loading}
                                value={boost.boostedValueFormatted}
                                label="My Boosted Value"
                                tooltip={myBoostedValueToolTip as any}
                            />
                        )}
                        <OverviewProgressStat
                            loading={loading}
                            isComingSoon={false}
                            value={boost.netBoostValue}
                            label="My Boost:"
                            simulatedValue={
                                boost.netBoostValue !== simValues.netBoostAfterTx
                                    ? `${formatNumberWithStyle(simValues.netBoostAfterTx, {
                                          minDecimals: 2,
                                          maxDecimals: 2,
                                      })}x`
                                    : undefined
                            }
                            alert={{ value: 'BOOST', status: Status.POSITIVE }}
                            fullWidth
                            progress={{
                                progress: boost.netBoostValue - 1,
                                label: `${formatNumberWithStyle(boost.netBoostValue, {
                                    minDecimals: 2,
                                    maxDecimals: 2,
                                })}x`,
                            }}
                            simulatedProgress={
                                boost.netBoostValue !== simValues.netBoostAfterTx
                                    ? {
                                          progress: simValues.netBoostAfterTx - 1,
                                          label: `${formatNumberWithStyle(simValues.netBoostAfterTx, {
                                              minDecimals: 2,
                                              maxDecimals: 2,
                                          })}x`,
                                      }
                                    : undefined
                            }
                            colorLimits={[0.25, 0.5, 0.75]}
                            labels={[
                                { progress: 0, label: '1x' },
                                { progress: 0.25, label: '1.25x' },
                                { progress: 0.5, label: '1.5x' },
                                { progress: 0.75, label: '1.75x' },
                                { progress: 1, label: '2x' },
                            ]}
                            tooltip={
                                isLpPool
                                    ? `Your boost is based on your stKITE share / staked LP share ratio. Max boost (2x) is achieved when your stKITE share is equal to or greater than your staked LP share.`
                                    : `Max boost is achieved when your ${tokenLabel} staking share is equal to or greater than the weighted average proportions of your incentivized positions.`
                            }
                        />
                    </>
                )}
            </Inner>
        </Container>
    )
}

const Container = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    ...props,
}))``
const Header = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    ...props,
}))`
    min-height: 60px;
    padding: 24px 0px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-start;
    `}
`

const GetLpButton = styled.a`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 0.9em;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.primary};
    background: transparent;
    border: 2px solid ${({ theme }) => theme.colors.primary};
    border-radius: 999px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s ease;

    &:hover {
        background: ${({ theme }) => theme.colors.primary};
        color: white;
    }
`

const Inner = styled(Grid).attrs((props) => ({
    $width: '100%',
    $columns: 'repeat(6, 1fr)',
    $align: 'stretch',
    ...props,
}))<DashedContainerProps>`
    ${DashedContainerStyle}
    & > * {
        padding: 18px;
        &:nth-child(1) {
            grid-column: 1 / 4;
        }
        &:nth-child(2) {
            grid-column: 4 / -1;
        }
        &:nth-child(3) {
            grid-column: 1 / 3;
        }
        &:nth-child(4) {
            grid-column: 3 / 5;
        }
        &:nth-child(5) {
            grid-column: 5 / -1;
        }
        &:nth-child(6) {
            grid-column: 1 / -1;
        }
    }
    &::after {
        border-top: none;
        border-right: none;
    }

    ${({ theme }) => theme.mediaWidth.upToMedium`
        & > * {
            &:nth-child(1) {
                grid-column: 1 / -1;
            }
            &:nth-child(2) {
                grid-column: 1 / -1;
            }
            padding: 12px;
        }
    `}
`

import { useMemo } from 'react'
// import { useTranslation } from 'react-i18next'
// import { formatCollateralLabel } from '~/utils'
import { Status, formatNumberWithStyle } from '~/utils'
// import { useStoreState } from '~/store'
// import { useVault } from '~/providers/VaultProvider'
// import { useEarnStrategies } from '~/hooks'
// import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useStakingSummary } from '~/hooks/useStakingSummary'
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
type StakingSimulation = {
    stakingAmount: string
    unstakingAmount: string
    setStakingAmount: (amount: string) => void
    setUnstakingAmount: (amount: string) => void
}

type OverviewProps = {
    simulation: StakingSimulation
}

export function Overview({ simulation }: OverviewProps) {
    const { stakingAmount, unstakingAmount } = simulation
    // const { t } = useTranslation()
    const {
        loading,
        kitePrice,
        totalStaked,
        myStaked,
        myShare,
        stakingApr,
        boost,
        calculateSimulatedValues,
        isOptimistic,
    } = useStakingSummary()

    // Calculate simulated values if simulation values are provided
    const simValues = useMemo(
        () => calculateSimulatedValues(stakingAmount, unstakingAmount),
        [stakingAmount, unstakingAmount, calculateSimulatedValues]
    )

    // Tooltip content for boosted value
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
            <div style={{ marginBottom: '10px' }}>
                <Text $fontSize=".9rem" $fontWeight={700}>
                    HAI/WETH LP
                </Text>
                <Text $fontSize=".9rem">
                    {formatNumberWithStyle(boost.userLPPositionValue, {
                        minDecimals: 2,
                        maxDecimals: 2,
                        style: 'currency',
                    })}{' '}
                    +{' '}
                    {formatNumberWithStyle(boost.lpBoost, {
                        minDecimals: 0,
                        maxDecimals: 2,
                    })}
                    x Boost
                </Text>
            </div>
            <div>
                <Text $fontSize=".9rem" $fontWeight={700}>
                    HAI HOLD
                </Text>
                <Text $fontSize=".9rem">
                    {formatNumberWithStyle(boost.haiHoldPositionValue, {
                        minDecimals: 2,
                        maxDecimals: 2,
                        style: 'currency',
                    })}{' '}
                    +{' '}
                    {formatNumberWithStyle(boost.haiHoldBoost, {
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

                <Flex $justify="flex-end" $align="center" $gap={12} $fontSize="0.8em">
                    <Text>
                        KITE: &nbsp;
                        <strong>
                            {formatNumberWithStyle(kitePrice, {
                                minDecimals: 2,
                                maxDecimals: 2,
                                style: 'currency',
                            })}
                        </strong>
                    </Text>
                </Flex>
            </Header>
            <Inner $borderOpacity={0.2}>
                <OverviewStat
                    loading={loading}
                    value={totalStaked.amountFormatted}
                    token="KITE"
                    tokenLabel={'stKITE'}
                    simulatedToken="stKITE"
                    label="Total Staked KITE"
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
                    token="KITE"
                    tokenLabel={'stKITE'}
                    simulatedToken="stKITE"
                    label="My Staked KITE"
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
                    label="My stKITE Share"
                    simulatedValue={
                        simValues.myShareAfterTx !== myShare.value
                            ? `${formatNumberWithStyle(simValues.myShareAfterTx, {
                                  minDecimals: 0,
                                  maxDecimals: 2,
                              })}%`
                            : undefined
                    }
                />
                <OverviewStat
                    isComingSoon={false}
                    loading={loading}
                    value={stakingApr.formatted}
                    label="Staking APR"
                    tooltip={`The base staking APR is determined by protocol fees accrued in system surplus and the stream rate set by the DAO.`}
                />

                <OverviewStat
                    isComingSoon={false}
                    loading={loading}
                    value={boost.boostedValueFormatted}
                    label="My Boosted Value"
                    tooltip={myBoostedValueToolTip as any}
                />
                <OverviewProgressStat
                    loading={loading}
                    isComingSoon={false}
                    value={boost.netBoostValue}
                    label="My Net Boost:"
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
                    tooltip={`Max Net Boost is achieved when your KITE staking share is equal to or greater than the weighted average proportions of your incentivized positions.`}
                />
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

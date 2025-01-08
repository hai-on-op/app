import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCollateralLabel } from '~/utils'
import { Status, VaultAction, formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { useEarnStrategies } from '~/hooks'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text, CenteredFlex } from '~/styles'
import { Swirl } from '~/components/Icons/Swirl'
import { StatusLabel } from '~/components/StatusLabel'
import { OverviewProgressStat, OverviewStat } from './OverviewStat'
import { AlertTriangle, ArrowLeft, ArrowRight } from 'react-feather'

export function Overview() {
    const { t } = useTranslation()

    const {
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)

    const { rows } = useEarnStrategies()

    const { action, vault, collateral, riskStatus, safetyRatio, collateralRatio, simulation, summary } = useVault()

    const { apy = 0 } = rows.find(({ pair }) => pair[0] === collateral.name) || {}

    const progressProps = useMemo(() => {
        if (!collateralRatio || !safetyRatio || !collateral.liquidationData?.liquidationCRatio)
            return {
                progress: {
                    progress: 0,
                    label: '0%',
                },
                colorLimits: [0, 0.5, 1] as [number, number, number],
            }

        const MAX_FACTOR = 2.5

        const min = 100 * parseFloat(collateral.liquidationData?.liquidationCRatio)
        const max = safetyRatio * MAX_FACTOR
        const labels = [
            {
                progress: min / safetyRatio / MAX_FACTOR,
                label: (
                    <CenteredFlex $column $fontWeight={700}>
                        <CenteredFlex $gap={4}>
                            <AlertTriangle size={10} strokeWidth={2.5} />
                            <Text>{`${Math.floor(min)}%`}</Text>
                        </CenteredFlex>
                        <CenteredFlex $gap={2}>
                            <ArrowLeft size={8} />
                            <Text>LIQUIDATION</Text>
                        </CenteredFlex>
                    </CenteredFlex>
                ),
            },
            {
                progress: 1.5 / MAX_FACTOR,
                label: (
                    <CenteredFlex $column>
                        <Text>{`${Math.floor(1.5 * safetyRatio)}%`}</Text>
                        <CenteredFlex $gap={2}>
                            <Text>OKAY</Text>
                            <ArrowRight size={8} />
                        </CenteredFlex>
                    </CenteredFlex>
                ),
            },
            {
                progress: 2.2 / MAX_FACTOR,
                label: (
                    <CenteredFlex $column>
                        <Text>{`${Math.floor(2.2 * safetyRatio)}%`}</Text>
                        <CenteredFlex $gap={2}>
                            <Text>SAFE</Text>
                            <ArrowRight size={8} />
                        </CenteredFlex>
                    </CenteredFlex>
                ),
            },
        ]

        const crIsInfinite = collateralRatio === Infinity.toString() || collateralRatio === '∞'
        const simulatedCrIsInfinite =
            simulation?.collateralRatio === Infinity.toString() || simulation?.collateralRatio === '∞'
        return {
            progress: {
                progress: 0.23,
                label: 'something',
            },
            simulatedProgress:
                action !== VaultAction.CREATE && simulation?.collateralRatio
                    ? {
                          progress: simulatedCrIsInfinite
                              ? 1
                              : Math.min(parseFloat(simulation.collateralRatio), max) / max,
                          label: simulatedCrIsInfinite
                              ? 'No Debt'
                              : formatNumberWithStyle(simulation.collateralRatio, {
                                    maxDecimals: 1,
                                    scalingFactor: 0.01,
                                    style: 'percent',
                                }),
                      }
                    : undefined,
            labels,
            colorLimits: labels.map(({ progress }) => progress) as [number, number, number],
        }
    }, [
        action,
        collateralRatio,
        simulation?.collateralRatio,
        safetyRatio,
        collateral.liquidationData?.liquidationCRatio,
    ])

    const stakingData = {
        // Static data / meta
        kitePrice: 10.0, // KITE price in USD
        simulationMode: true, // Whether we're in simulation mode

        // Totals section
        totalStaked: {
            title: 'Total Staked KITE',
            skiteAmount: 42069, // 42,069 sKITE
            usdValue: 420690, // $420,690
            afterTx: 42138.042, // e.g. "42,138.042 KITE After Tx"
        },

        // My stake section
        myStaked: {
            title: 'My Staked KITE',
            skiteAmount: 420.69, // 420.69 sKITE
            usdValue: 4206.9, // $4,206.90
            afterTx: 489.732, // e.g. "489.732 After Tx"
        },

        // Additional details
        mySkiteShare: 1.0, // 1.00%
        mySkiteShareAfterTx: 1.5, // 1.00%
        myStakingAPY: 6.9, // 6.9%
        myBoostedVaults: 4, // 4 boosted vaults

        // Boost section
        myNetHaiBoost: 1.69, // 1.69x
        myNetHaiBoostAfterTx: 2.0, // 2.0x
        boostSlider: {
            min: 1.0, // "No Boost" = 1x
            max: 2.0, // "Max Boost" = 2x
            current: 1.69, // Current boost on the slider
        },
    }

    return (
        <Container>
            <Header>
                <Flex $justify="flex-start" $align="center" $gap={12}>
                    <Text $fontWeight={700}>Staking Overview {vault ? `#${vault.id}` : ''}</Text>
                    {stakingData.simulationMode && (
                        <StatusLabel status={Status.CUSTOM} background="gradient">
                            <CenteredFlex $gap={8}>
                                <Swirl size={14} />
                                <Text $fontSize="0.67rem" $fontWeight={700}>
                                    Simulation
                                </Text>
                            </CenteredFlex>
                        </StatusLabel>
                    )}
                </Flex>

                <Flex $justify="flex-end" $align="center" $gap={12} $fontSize="0.8em">
                    <Text>
                        KITE: &nbsp;
                        <strong>
                            {formatNumberWithStyle(stakingData.kitePrice, {
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
                    value={formatNumberWithStyle(stakingData.totalStaked.skiteAmount, {
                        minDecimals: 0,
                        maxDecimals: 0,
                    })}
                    token="KITE"
                    tokenLabel={'sKITE'}
                    label="Total Staked KITE"
                    convertedValue={formatNumberWithStyle(stakingData.totalStaked.usdValue, {
                        minDecimals: 0,
                        maxDecimals: 0,
                        style: 'currency',
                    })}
                    simulatedValue={formatNumberWithStyle(stakingData.totalStaked.afterTx, {
                        minDecimals: 0,
                        maxDecimals: 0,
                    })}
                    labelOnTop
                />
                <OverviewStat
                    value={formatNumberWithStyle(stakingData.myStaked.skiteAmount, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}
                    token="KITE"
                    tokenLabel={'sKITE'}
                    label="My Staked KITE"
                    convertedValue={formatNumberWithStyle(stakingData.myStaked.usdValue, {
                        minDecimals: 2,
                        maxDecimals: 2,
                        style: 'currency',
                    })}
                    simulatedValue={formatNumberWithStyle(stakingData.myStaked.afterTx, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}
                    labelOnTop
                />
                <OverviewStat
                    value={`${stakingData.mySkiteShare}%`}
                    label="My sKITE Share"
                    simulatedValue={`${stakingData.mySkiteShareAfterTx}%`}
                    tooltip={t('liquidation_price_tip')}
                />
                <OverviewStat
                    value={`${stakingData.myStakingAPY}%`}
                    label="My Staking APY"
                    tooltip={`Minimum collateral ratio required for opening a new vault. Vaults opened at this ratio will likely be at high risk of liquidation.`}
                />

                <OverviewStat
                    value={stakingData.myBoostedVaults}
                    label="My Boosted Vaults"
                    tooltip={t('stability_fee_tip')}
                />
                <OverviewProgressStat
                    value={stakingData.myNetHaiBoost}
                    label="My Net HAI Boost:"
                    simulatedValue={`${stakingData.myNetHaiBoostAfterTx}x`}
                    alert={{ value: 'BOOST', status: Status.POSITIVE }}
                    fullWidth
                    progress={{
                        progress: 0.23,
                        label: 'something',
                    }}
                    simulatedProgress={{
                        progress: 0.76,
                        label: 'another thing',
                    }}
                    labels={[]}
                    colorLimits={[0.25, 0.5, 0.75]}
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

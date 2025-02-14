import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCollateralLabel } from '~/utils'
import { Status, VaultAction, formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { useEarnStrategies } from '~/hooks'
import { useStakingData } from '~/hooks/useStakingData'
import { Loader } from '~/components/Loader'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text, CenteredFlex } from '~/styles'
import { Swirl } from '~/components/Icons/Swirl'
import { StatusLabel } from '~/components/StatusLabel'
import { OverviewProgressStat, OverviewStat } from './OverviewStat'
import { AlertTriangle, ArrowLeft, ArrowRight } from 'react-feather'

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
    const { t } = useTranslation()
    const { stakingData, stakingStats, loading } = useStakingData()

    const kitePrice = 10.0 // TODO: Get real KITE price from somewhere

    const stakingSummary = useMemo(() => {
        if (loading) return null

        const totalStakedUSD = Number(stakingStats.totalStaked) * kitePrice
        const myStakedUSD = Number(stakingData.stakedBalance) * kitePrice
        const myShare = stakingStats.totalStaked !== '0' 
            ? (Number(stakingData.stakedBalance) / Number(stakingStats.totalStaked)) * 100 
            : 0

        // Calculate simulated values
        const simulatedStakedBalance = Number(stakingData.stakedBalance) + 
            (Number(stakingAmount) || 0) - 
            (Number(unstakingAmount) || 0)
        
        const simulatedTotalStaked = Number(stakingStats.totalStaked) + 
            (Number(stakingAmount) || 0) - 
            (Number(unstakingAmount) || 0)

        const simulatedShare = simulatedTotalStaked !== 0 
            ? (simulatedStakedBalance / simulatedTotalStaked) * 100 
            : 0

        return {
            // Static data / meta
            kitePrice,
            simulationMode: Boolean(stakingAmount || unstakingAmount),

            // Totals section
            totalStaked: {
                title: 'Total Staked KITE',
                skiteAmount: Number(stakingStats.totalStaked),
                usdValue: totalStakedUSD,
                afterTx: simulatedTotalStaked,
            },

            // My stake section
            myStaked: {
                title: 'My Staked KITE',
                skiteAmount: Number(stakingData.stakedBalance),
                usdValue: myStakedUSD,
                afterTx: simulatedStakedBalance,
            },

            // Additional details
            mySkiteShare: myShare,
            mySkiteShareAfterTx: simulatedShare,
            myStakingAPY: 'N/A', // TODO: Calculate real APY
            myBoostedVaults: 4, // TODO: Get real boosted vaults count

            // Boost section
            myNetHaiBoost: 1.69, // TODO: Calculate real boost
            myNetHaiBoostAfterTx: 1.69, // Will be different in simulation mode
            boostSlider: {
                min: 1.0,
                max: 2.0,
                current: 1.69,
            },
        }
    }, [stakingData, stakingStats, loading, kitePrice, stakingAmount, unstakingAmount])

    if (loading || !stakingSummary) {
        return (
            <Container>
                <Header>
                    <Flex $width="100%" $justify="center" $align="center">
                        <Loader size={32} />
                    </Flex>
                </Header>
            </Container>
        )
    }

    return (
        <Container>
            <Header>
                <Flex $justify="flex-start" $align="center" $gap={12}>
                    <Text $fontWeight={700}>Staking Overview</Text>
                    {stakingSummary.simulationMode && (
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
                            {formatNumberWithStyle(stakingSummary.kitePrice, {
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
                    value={formatNumberWithStyle(stakingSummary.totalStaked.skiteAmount, {
                        minDecimals: 0,
                        maxDecimals: 0,
                    })}
                    token="KITE"
                    tokenLabel={'sKITE'}
                    label="Total Staked KITE"
                    convertedValue={formatNumberWithStyle(stakingSummary.totalStaked.usdValue, {
                        minDecimals: 0,
                        maxDecimals: 0,
                        style: 'currency',
                    })}
                    simulatedValue={formatNumberWithStyle(stakingSummary.totalStaked.afterTx, {
                        minDecimals: 0,
                        maxDecimals: 0,
                    })}
                    labelOnTop
                />
                <OverviewStat
                    value={formatNumberWithStyle(stakingSummary.myStaked.skiteAmount, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}
                    token="KITE"
                    tokenLabel={'sKITE'}
                    label="My Staked KITE"
                    convertedValue={formatNumberWithStyle(stakingSummary.myStaked.usdValue, {
                        minDecimals: 2,
                        maxDecimals: 2,
                        style: 'currency',
                    })}
                    simulatedValue={formatNumberWithStyle(stakingSummary.myStaked.afterTx, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}
                    labelOnTop
                />
                <OverviewStat
                    value={`${formatNumberWithStyle(stakingSummary.mySkiteShare, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}%`}
                    label="My sKITE Share"
                    simulatedValue={`${formatNumberWithStyle(stakingSummary.mySkiteShareAfterTx, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}%`}
                />
                <OverviewStat
                    value={'N/A'/*`${formatNumberWithStyle(stakingSummary.myStakingAPY, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}%`*/}
                    label="My Staking APY"
                    tooltip={`Minimum collateral ratio required for opening a new vault. Vaults opened at this ratio will likely be at high risk of liquidation.`}
                />

                <OverviewStat
                    value={'N/A'}//stakingSummary.myBoostedVaults}
                    label="My Boosted Vaults"
                    tooltip={t('stability_fee_tip')}
                />
                <OverviewProgressStat
                    value={'N/A'}//stakingSummary.myNetHaiBoost}
                    label="My Net HAI Boost:"
                    simulatedValue={/*`${formatNumberWithStyle(stakingSummary.myNetHaiBoostAfterTx, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}x`*/'N/A'}
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

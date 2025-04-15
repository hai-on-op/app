import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCollateralLabel } from '~/utils'
import { Status, VaultAction, formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { useEarnStrategies } from '~/hooks'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useStakingData } from '~/hooks/useStakingData'
import { Loader } from '~/components/Loader'
import { ComingSoon } from '~/components/ComingSoon'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text, CenteredFlex } from '~/styles'
import { Swirl } from '~/components/Icons/Swirl'
import { StatusLabel } from '~/components/StatusLabel'
import { OverviewProgressStat, OverviewStat } from './OverviewStat'
import { AlertTriangle, ArrowLeft, ArrowRight } from 'react-feather'
import { useBoost } from '~/hooks/useBoost'

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
    const {
        userHaiVELODeposited,
        totalHaiVELODeposited,
        userKITEStaked,
        totalKITEStaked,
        userLPPosition,
        totalPoolLiquidity,
        userLPPositionValue,
        haiWethLpBoost,
        formattedValues,
        userSharePercentage,
        boostFactor,
        maxBoostFactor,
        boostProgress,
        boostedVaultsCount,
        haiVeloBoost,
        loading: boostLoading,
    } = useBoost()


    console.log('haiVeloBoost', haiVeloBoost)

    // Log HAI/WETH LP boost and LP value
    console.log('Overview - HAI/WETH LP Boost:', haiWethLpBoost)
    console.log('Overview - HAI/WETH LP Value (USD):', userLPPositionValue)
    console.log('Overview - HAI/WETH LP Formatted Boost:', formattedValues.haiWethLpBoost)
    console.log('Overview - HAI/WETH LP Formatted Value:', formattedValues.positionValue)

    const { prices: veloPrices } = useVelodromePrices()

    const kitePrice = Number(veloPrices?.KITE?.raw || 0)

    console.log('stakingData', stakingData)
    console.log('stakingStats', stakingStats)

    const stakingSummary = useMemo(() => {
        if (loading || boostLoading) return null

        const totalStakedUSD = Number(stakingStats.totalStaked) * kitePrice
        const myStakedUSD = Number(stakingData.stakedBalance) * kitePrice
        const myShare =
            stakingStats.totalStaked !== '0'
                ? (Number(stakingData.stakedBalance) / Number(stakingStats.totalStaked)) * 100
                : 0

        // Calculate simulated values
        const simulatedStakedBalance =
            Number(stakingData.stakedBalance) + (Number(stakingAmount) || 0) - (Number(unstakingAmount) || 0)

        const simulatedTotalStaked =
            Number(stakingStats.totalStaked) + (Number(stakingAmount) || 0) - (Number(unstakingAmount) || 0)

        const simulatedShare = simulatedTotalStaked !== 0 ? (simulatedStakedBalance / simulatedTotalStaked) * 100 : 0

        return {
            // Static data / meta
            kitePrice,
            simulationMode: Boolean(stakingAmount || unstakingAmount),

            // Totals section
            totalStaked: {
                title: 'Total Staked KITE',
                stKiteAmount: Number(stakingStats.totalStaked),
                usdValue: totalStakedUSD,
                afterTx: simulatedTotalStaked,
            },

            // My stake section
            myStaked: {
                title: 'My Staked KITE',
                stKiteAmount: Number(stakingData.stakedBalance),
                usdValue: myStakedUSD,
                afterTx: simulatedStakedBalance,
            },

            // Additional details
            myStKiteShare: myShare,
            myStKiteShareAfterTx: simulatedShare,
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

    if (loading || boostLoading || !stakingSummary) {
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

    const myBoostedValueToolTip = (
        <div>
            <h1>Boosted Value</h1>
        </div>
    )

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
                    value={formatNumberWithStyle(stakingSummary.totalStaked.stKiteAmount, {
                        minDecimals: 0,
                        maxDecimals: 0,
                    })}
                    token="KITE"
                    tokenLabel={'stKITE'}
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
                    value={formatNumberWithStyle(stakingSummary.myStaked.stKiteAmount, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}
                    token="KITE"
                    tokenLabel={'stKITE'}
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
                    value={`${formatNumberWithStyle(stakingSummary.myStKiteShare, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}%`}
                    label="My stKITE Share"
                    simulatedValue={`${formatNumberWithStyle(stakingSummary.myStKiteShareAfterTx, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}%`}
                />
                <OverviewStat
                    isComingSoon={false}
                    value={
                        'N/A' /*`${formatNumberWithStyle(stakingSummary.myStakingAPY, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}%`*/
                    }
                    label="My Staking APY"
                    tooltip={`Minimum collateral ratio required for opening a new vault. Vaults opened at this ratio will likely be at high risk of liquidation.`}
                />

                <OverviewStat
                    isComingSoon={false}
                    value={'N/A'} //stakingSummary.myBoostedVaults}
                    label="My Boosted Value"
                    // tooltip={t('stability_fee_tip')}
                    tooltip={myBoostedValueToolTip as any}
                />
                <OverviewProgressStat
                    isComingSoon={false}
                    value={'N/A'} //stakingSummary.myNetHaiBoost}
                    label="My Net Boost:"
                    simulatedValue={
                        /*`${formatNumberWithStyle(stakingSummary.myNetHaiBoostAfterTx, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}x`*/ 'N/A'
                    }
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

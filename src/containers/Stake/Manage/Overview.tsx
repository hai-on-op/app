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
import { BigNumber, utils } from 'ethers'
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
    const { stakingData, stakingStats, loading, stakingApyData, totalStaked } = useStakingData()
    const boostData = useBoost()
    const { prices: veloPrices } = useVelodromePrices()

    const {
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)

    const {
        userHaiVELODeposited,
        totalHaiVELODeposited,
        userKITEStaked,
        totalKITEStaked,
        userLPPosition,
        totalPoolLiquidity,
        userLPPositionValue,
        haiWethLpBoost,
        lpBoostValue,
        userTotalValue,
        formattedValues,
        userSharePercentage,
        boostFactor,
        maxBoostFactor,
        boostProgress,
        boostedVaultsCount,
        haiVeloBoost,
        hvBoost,
        netBoost,
        simulateNetBoost,
        netBoostValue,
        haiVeloPositionValue,
        loading: boostLoading,
    } = boostData

    //const totalStaked = stakingTotalStaked ? stakingTotalStaked : stakingStats ? stakingStats.totalStaked : 0

    // --------------------------------
    // Staking APY Calculation Example
    // --------------------------------
    //
    // pool A:
    // rate = .000165343915343915
    // price = 1.18688975069085

    // pool B:
    // rate = .000165343915343915
    // price = 1.159339

    // pool C:
    // rate = .000165343915343915
    // price = 0.6634020531829766

    // Total Staked = 20
    // Staked asset price = 1.159339

    // totalRewardValuePerSecond = (.000165343915343915 * 1.18688975069085) + (.000165343915343915 * 1.159339) + (.000165343915343915 * 0.6634020531829766)
    // totalRewardValuePerSecond = 0.000497624140852152833989406075139

    // totalRewardValuePerYear = totalRewardValuePerSecond * 31,536,000
    // totalRewardValuePerYear = 0.000497624140852152833989406075139 * 31536000
    // totalRewardValuePerYear = 15693.074905913491772689909985583504

    // totalStakedValue = 20 * 1.159339
    // totalStakedValue = 23.18678

    // APR = totalRewardValuePerYear / totalStakedValue
    // APR = 15693 / 23.18678

    // APR = 676
    //
    // --------------------------------

    const haiPrice = parseFloat(liquidationData?.currentRedemptionPrice || '1')
    const kitePrice = Number(veloPrices?.KITE?.raw || 0)
    const opPrice = Number(liquidationData?.collateralLiquidationData?.OP?.currentPrice.value || 0)

    const HAI_ADDRESS = import.meta.env.VITE_HAI_ADDRESS
    const KITE_ADDRESS = import.meta.env.VITE_KITE_ADDRESS
    const OP_ADDRESS = import.meta.env.VITE_OP_ADDRESS

    console.log(netBoostValue)

    const rewardsDataMap = {
        [HAI_ADDRESS]: haiPrice,
        [KITE_ADDRESS]: kitePrice,
        [OP_ADDRESS]: opPrice,
    }
    const stakingApyRewardsTotal = stakingApyData.reduce((acc, item) => {
        const price = rewardsDataMap[item.rpToken as any]
        const scaledPrice = utils.parseUnits(price.toString(), 18)
        const amount = item.rpRate.mul(scaledPrice)
        const nextAcc = acc.add(amount)
        return nextAcc
    }, BigNumber.from(0))
    // const totalStaked = totalStaked

    // Ensure totalStaked is a number
    const totalStakedNumber = Number(stakingStats.totalStaked) || 0

    let stakingApy = 0
    if (!isNaN(totalStakedNumber) && totalStakedNumber !== 0 && kitePrice !== 0) {
        const stakingApyRewardsTotalYearly = stakingApyRewardsTotal.mul(31536000)
        const scaledKitePrice = utils.parseUnits(kitePrice.toString(), 18)
        const scaledTotalStaked = utils.parseUnits(totalStakedNumber.toString(), 18)
        const scaledTotalStakedUSD = scaledTotalStaked.mul(scaledKitePrice)
        stakingApy = Number(stakingApyRewardsTotalYearly.div(scaledTotalStakedUSD).toString())
    }

    const stakingSummary = useMemo(() => {
        if (loading || boostLoading) return null

        const totalStakedValue = Number(totalStaked) / 10 ** 18

        const totalStakedUSD = Number(totalStakedValue) * kitePrice
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
            simulationMode: Boolean(
                (stakingAmount || unstakingAmount) && (Number(stakingAmount) > 0 || Number(unstakingAmount) > 0)
            ),

            // Totals section
            totalStaked: {
                title: 'Total Staked KITE',
                stKiteAmount: Number(totalStakedValue),
                usdValue: totalStakedUSD,
                afterTx: Number(totalStakedValue) + (Number(stakingAmount) || 0) - (Number(unstakingAmount) || 0),
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
            myStakingAPY: stakingApy, // TODO: Calculate real APY
            myBoostedVaults: 4, // TODO: Get real boosted vaults count

            // Boost section
            myNetHaiBoost: netBoostValue, // TODO: Calculate real boost
            myNetHaiBoostAfterTx: 1.69, // Will be different in simulation mode
            boostSlider: {
                min: 1.0,
                max: 2.0,
                current: 1.69,
            },
        }
    }, [stakingData, stakingStats, boostLoading, loading, kitePrice, stakingAmount, unstakingAmount])

    const simulateNetBoostValue = useMemo(() => {
        if (!stakingSummary) return 1
        return simulateNetBoost(stakingSummary?.myStaked.afterTx, stakingSummary?.totalStaked.afterTx)
    }, [stakingSummary, stakingSummary?.myStaked.afterTx, stakingSummary?.totalStaked.afterTx])

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
        <div style={{ width: '100%' }}>
            <div style={{ marginBottom: '10px' }}>
                <Text $fontSize=".9rem" $fontWeight={700}>
                    haiVELO
                </Text>
                <Text $fontSize=".9rem">
                    {formatNumberWithStyle(Number(haiVeloPositionValue), {
                        minDecimals: 2,
                        maxDecimals: 2,
                        style: 'currency',
                    })}{' '}
                    +{' '}
                    {formatNumberWithStyle(Number(hvBoost), {
                        minDecimals: 0,
                        maxDecimals: 1,
                    })}
                    x Boost
                </Text>
            </div>
            <div>
                <Text $fontSize=".9rem" $fontWeight={700}>
                    HAI/WETH LP
                </Text>
                <Text $fontSize=".9rem">
                    {formatNumberWithStyle(userLPPositionValue, {
                        minDecimals: 2,
                        maxDecimals: 2,
                        style: 'currency',
                    })}{' '}
                    +{' '}
                    {formatNumberWithStyle(Number(lpBoostValue), {
                        minDecimals: 0,
                        maxDecimals: 1,
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
                        maxDecimals: 2,
                    })}
                    token="KITE"
                    tokenLabel={'stKITE'}
                    simulatedToken="stKITE"
                    label="Total Staked KITE"
                    convertedValue={formatNumberWithStyle(stakingSummary.totalStaked.usdValue, {
                        minDecimals: 0,
                        maxDecimals: 2,
                        style: 'currency',
                    })}
                    simulatedValue={
                        stakingSummary.totalStaked.afterTx !== stakingSummary.totalStaked.stKiteAmount
                            ? formatNumberWithStyle(stakingSummary.totalStaked.afterTx, {
                                  minDecimals: 0,
                                  maxDecimals: 2,
                              })
                            : undefined
                    }
                    labelOnTop
                />
                <OverviewStat
                    value={formatNumberWithStyle(stakingSummary.myStaked.stKiteAmount, {
                        minDecimals: 0,
                        maxDecimals: 2,
                    })}
                    token="KITE"
                    tokenLabel={'stKITE'}
                    simulatedToken="stKITE"
                    label="My Staked KITE"
                    convertedValue={formatNumberWithStyle(stakingSummary.myStaked.usdValue, {
                        minDecimals: 0,
                        maxDecimals: 2,
                        style: 'currency',
                    })}
                    simulatedValue={
                        stakingSummary.myStaked.afterTx !== stakingSummary.myStaked.stKiteAmount
                            ? formatNumberWithStyle(stakingSummary.myStaked.afterTx, {
                                  minDecimals: 0,
                                  maxDecimals: 2,
                              })
                            : undefined
                    }
                    labelOnTop
                />
                <OverviewStat
                    value={`${formatNumberWithStyle(stakingSummary.myStKiteShare, {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })}%`}
                    label="My stKITE Share"
                    simulatedValue={
                        stakingSummary.myStKiteShareAfterTx !== stakingSummary.myStKiteShare
                            ? `${formatNumberWithStyle(stakingSummary.myStKiteShareAfterTx, {
                                  minDecimals: 0,
                                  maxDecimals: 2,
                              })}%`
                            : undefined
                    }
                />
                <OverviewStat
                    isComingSoon={false}
                    value={`${formatNumberWithStyle(stakingApy, {
                        minDecimals: 0,
                        maxDecimals: 2,
                    })}%`}
                    label="My Staking APY"
                    tooltip={`Minimum collateral ratio required for opening a new vault. Vaults opened at this ratio will likely be at high risk of liquidation.`}
                />

                <OverviewStat
                    isComingSoon={false}
                    value={formatNumberWithStyle(userTotalValue, {
                        minDecimals: 0,
                        maxDecimals: 2,
                        style: 'currency',
                    })}
                    label="My Boosted Value"
                    tooltip={myBoostedValueToolTip as any}
                />
                <OverviewProgressStat
                    isComingSoon={false}
                    value={`${formatNumberWithStyle(netBoostValue, {
                        minDecimals: 0,
                        maxDecimals: 2,
                    })}`}
                    label="My Net Boost:"
                    simulatedValue={
                        stakingSummary.myStKiteShareAfterTx !== stakingSummary.myStKiteShare
                            ? `${formatNumberWithStyle(simulateNetBoostValue, {
                                  minDecimals: 2,
                                  maxDecimals: 2,
                              })}x`
                            : undefined
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

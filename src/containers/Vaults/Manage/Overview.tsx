import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCollateralLabel } from '~/utils'
import { Status, VaultAction, formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
// import { useEarnStrategies } from '~/hooks'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text, CenteredFlex } from '~/styles'
import { Swirl } from '~/components/Icons/Swirl'
import { StatusLabel } from '~/components/StatusLabel'
import { OverviewProgressStat, OverviewStat } from './OverviewStat'
import { AlertTriangle, ArrowLeft, ArrowRight } from 'react-feather'
import { useAccount } from 'wagmi'
import { useHaiVeloData } from '~/hooks/useHaiVeloData'
import { calculateHaiVeloBoost } from '~/services/boostService'

export function Overview({ isHAIVELO }: { isHAIVELO: boolean }) {
    const { t } = useTranslation()
    const { address } = useAccount()

    const { userCollateralMapping } = useHaiVeloData()

    const {
        vaultModel: { liquidationData },
        stakingModel: { usersStakingData },
    } = useStoreState((state) => state)

    const HAI_VELO_DAILY_REWARDS = 200

    const { action, vault, collateral, riskStatus, safetyRatio, collateralRatio, simulation, summary, formState } =
        useVault()

    const userHaiVeloBoostData = useMemo(() => {
        if (!address)
            return {
                mystKiteShare: 0,
                totalKite: 0,
            }

        const totalHaiVeloDeposited = Object.values(userCollateralMapping).reduce((acc, value) => {
            return acc + Number(value)
        }, 0)

        const totalKite = Object.values(usersStakingData).reduce((acc, curr) => acc + Number(curr.stakedBalance), 0)

        console.log(totalKite, usersStakingData)

        const userHaiVeloBoostMap: Record<string, number> = Object.entries(userCollateralMapping).reduce(
            (acc, [address, value]) => {
                if (!usersStakingData[address.toLowerCase()]) return { ...acc, [address]: 1 }

                return {
                    ...acc,
                    [address]: calculateHaiVeloBoost({
                        userStakingAmount: Number(usersStakingData[address.toLowerCase()]?.stakedBalance),
                        totalStakingAmount: Number(totalKite),
                        userHaiVELODeposited: Number(value),
                        totalHaiVELODeposited: Number(totalHaiVeloDeposited),
                    }).haiVeloBoost,
                }
            },
            {}
        )

        const calculateTotalBoostedValueParticipating = () => {
            return Object.entries(userCollateralMapping).reduce((acc, [address, value]) => {
                return acc + Number(value) * userHaiVeloBoostMap[address]
            }, 0)
        }

        const mystKiteShare = totalKite ? Number(usersStakingData[address.toLowerCase()]?.stakedBalance) / totalKite : 0

        const totalBoostedValueParticipating = calculateTotalBoostedValueParticipating()

        const baseAPR = totalBoostedValueParticipating
            ? (HAI_VELO_DAILY_REWARDS / totalBoostedValueParticipating) * 365 * 100
            : 0

        const myBoost = address ? userHaiVeloBoostMap[address.toLowerCase()] : 1

        const myValueParticipating = address ? userCollateralMapping[address.toLowerCase()] : 0

        const myBoostedValueParticipating = Number(myValueParticipating) * myBoost

        const myBoostedShare = totalBoostedValueParticipating
            ? myBoostedValueParticipating / totalBoostedValueParticipating
            : 0

        const simulateBoostAfterDeposit = (amount: number) => {
            const currentUserDeposit = userCollateralMapping[address.toLowerCase()]

            return calculateHaiVeloBoost({
                userStakingAmount: Number(usersStakingData[address.toLowerCase()]?.stakedBalance),
                totalStakingAmount: Number(totalKite),
                userHaiVELODeposited: Number(currentUserDeposit) + Number(amount),
                totalHaiVELODeposited: Number(totalHaiVeloDeposited) + Number(amount),
            }).haiVeloBoost
        }

        const effectiveDeposit = formState.withdraw
            ? -1 * Number(formState.withdraw)
            : formState.deposit
                ? Number(formState.deposit)
                : 0

        const simulatedBoostAfterDeposit = simulateBoostAfterDeposit(effectiveDeposit)

        const myHaiVeloShare = Number(myValueParticipating) / Number(totalHaiVeloDeposited)

        const myHaiVeloSimulatedShare =
            (Number(myValueParticipating) + effectiveDeposit) / (Number(totalHaiVeloDeposited) + effectiveDeposit)

        const myBoostedAPR = myBoost * baseAPR //((myBoostedShare * HAI_VELO_DAILY_REWARDS) / myValueParticipating) * 365 * 100

        return {
            mystKiteShare,
            myHaiVeloShare,
            totalKite,
            myBoostedShare,
            baseAPR,
            myBoost,
            myValueParticipating,
            myBoostedValueParticipating,
            simulatedBoostAfterDeposit,
            myHaiVeloSimulatedShare,
            myBoostedAPR,
        }
    }, [address, usersStakingData, userCollateralMapping, formState])

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
                progress: crIsInfinite ? 1 : Math.min(parseFloat(collateralRatio), max) / max,
                label: crIsInfinite
                    ? 'No Debt'
                    : formatNumberWithStyle(collateralRatio, {
                        maxDecimals: 1,
                        scalingFactor: 0.01,
                        style: 'percent',
                    }),
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

    return (
        <Container>
            <Header>
                <Flex $justify="flex-start" $align="center" $gap={12}>
                    <Text $fontWeight={700}>Vault Overview {vault ? `#${vault.id}` : ''}</Text>
                    {!!simulation && !!vault && (
                        <StatusLabel status={Status.CUSTOM} background="gradientCooler">
                            <CenteredFlex $gap={8}>
                                <Swirl size={14} />
                                <Text $fontSize="0.67rem" $fontWeight={700}>
                                    Simulation
                                </Text>
                            </CenteredFlex>
                        </StatusLabel>
                    )}
                </Flex>
                <StatusLabel
                    status={
                        userHaiVeloBoostData.myBoostedAPR === userHaiVeloBoostData.baseAPR
                            ? Status.NO_DEBT
                            : Status.POSITIVE
                    }
                >
                    <span style={{ color: 'black' }}>
                        {userHaiVeloBoostData.baseAPR
                            ? formatNumberWithStyle(userHaiVeloBoostData.baseAPR, {
                                minDecimals: 1,
                                maxDecimals: 1,
                                style: 'percent',
                                suffixed: true,
                            })
                            : '--%'}
                    </span>{' '}
                    {userHaiVeloBoostData.myBoostedAPR !== userHaiVeloBoostData.baseAPR
                        ? userHaiVeloBoostData.myBoostedAPR
                            ? formatNumberWithStyle(userHaiVeloBoostData.myBoostedAPR, {
                                minDecimals: 1,
                                maxDecimals: 1,
                                style: 'percent',
                                suffixed: true,
                            })
                            : '--%'
                        : ''}{' '}
                    APR
                </StatusLabel>
                <Flex $justify="flex-end" $align="center" $gap={12} $fontSize="0.8em">
                    <Text>
                        {formatCollateralLabel(collateral.name)}:&nbsp;
                        <strong>
                            {collateral.priceInUSD
                                ? formatNumberWithStyle(collateral.priceInUSD.toString(), {
                                    minDecimals: 2,
                                    maxDecimals: 2,
                                    style: 'currency',
                                })
                                : '--'}
                        </strong>
                    </Text>
                    <Text>
                        HAI (RP):&nbsp;
                        <strong>
                            {liquidationData?.currentRedemptionPrice
                                ? formatNumberWithStyle(liquidationData.currentRedemptionPrice, {
                                    minDecimals: 2,
                                    maxDecimals: 2,
                                    style: 'currency',
                                })
                                : '--'}
                        </strong>
                    </Text>
                </Flex>
            </Header>
            <Inner $borderOpacity={0.2}>
                <OverviewStat
                    value={summary.collateral.current?.formatted || summary.collateral.after.formatted}
                    token={collateral.name as any}
                    tokenLabel={formatCollateralLabel(collateral.name)}
                    label="Locked Collateral"
                    convertedValue={summary.collateral.current?.usdFormatted || summary.collateral.after.usdFormatted}
                    simulatedValue={vault && simulation?.collateral ? summary.collateral.after.formatted : ''}
                    labelOnTop
                />
                <OverviewStat
                    value={summary.debt.current?.formatted || summary.debt.after.formatted}
                    token="HAI"
                    label="Minted HAI Debt"
                    convertedValue={summary.debt.current?.usdFormatted || summary.debt.after.usdFormatted}
                    simulatedValue={vault && simulation?.debt ? summary.debt.after.formatted : ''}
                    labelOnTop
                />
                <OverviewStat
                    value={summary.liquidationPrice.current?.formatted || summary.liquidationPrice.after.formatted}
                    label="Liq. Price"
                    simulatedValue={
                        vault && simulation?.liquidationPrice ? summary.liquidationPrice.after.formatted : undefined
                    }
                    tooltip={t('liquidation_price_tip')}
                />
                {!vault ? (
                    <OverviewStat
                        value={
                            safetyRatio
                                ? formatNumberWithStyle(safetyRatio, {
                                    style: 'percent',
                                    maxDecimals: 1,
                                    scalingFactor: 0.01,
                                })
                                : '--'
                        }
                        label="Min. Coll. Ratio"
                        tooltip={`Minimum collateral ratio required for opening a new vault. Vaults opened at this ratio will likely be at high risk of liquidation.`}
                    />
                ) : (
                    <OverviewStat
                        value={
                            collateral.liquidationData?.liquidationCRatio
                                ? formatNumberWithStyle(collateral.liquidationData.liquidationCRatio, {
                                    style: 'percent',
                                    maxDecimals: 1,
                                })
                                : '--'
                        }
                        label="Liq. Coll. Ratio"
                        tooltip={`Minimum collateral ratio below which, this vault is at risk of being liquidated`}
                    />
                )}
                <OverviewStat
                    value={summary.stabilityFee.formatted}
                    label="Stability Fee"
                    tooltip={t('stability_fee_tip')}
                />
                <OverviewProgressStat
                    value={summary.collateralRatio.current?.formatted || summary.collateralRatio.after.formatted}
                    label="My Collateral Ratio:"
                    simulatedValue={
                        vault && simulation?.riskStatus
                            ? `${simulation.collateralRatio ? summary.collateralRatio.after.formatted : '--%'} (${
                                simulation.riskStatus
                            })`
                            : undefined
                    }
                    alert={riskStatus ? { status: riskStatus } : undefined}
                    {...progressProps}
                    fullWidth
                />
                {isHAIVELO ? (
                    <>
                        <OverviewStat
                            value={formatNumberWithStyle(userHaiVeloBoostData.mystKiteShare, {
                                minDecimals: 2,
                                maxDecimals: 2,
                                scalingFactor: 1,
                                style: 'percent',
                            })}
                            label="My stKITE Share"
                            button={
                                userHaiVeloBoostData.myBoost === 2
                                    ? undefined
                                    : {
                                        variant: 'yellowish',
                                        text: 'Stake KITE',
                                        onClick: () => {
                                            window.location.href = '/stake'
                                        },
                                    }
                            }
                            tooltip={'Your staking share of the total stKITE supply'}
                        />
                        <OverviewStat
                            value={`${formatNumberWithStyle(Number(userHaiVeloBoostData.myHaiVeloShare), {
                                minDecimals: 0,
                                maxDecimals: 2,
                                scalingFactor: 1,
                                style: 'percent',
                            })}`}
                            label="My haiVELO Share"
                            simulatedValue={
                                userHaiVeloBoostData.myHaiVeloShare !== userHaiVeloBoostData.myHaiVeloSimulatedShare
                                    ? `${formatNumberWithStyle(Number(userHaiVeloBoostData.myHaiVeloSimulatedShare), {
                                        minDecimals: 0,
                                        maxDecimals: 2,
                                        scalingFactor: 1,
                                        style: 'percent',
                                    })}`
                                    : ''
                            }
                            tooltip={'The amount of  haiVELO you have in compare to the total haiVELO supply'}
                        />
                        <OverviewStat
                            value={`${formatNumberWithStyle(Number(userHaiVeloBoostData.myBoost), {
                                minDecimals: 0,
                                maxDecimals: 2,
                                scalingFactor: 1,
                            })}x`}
                            label="Boost"
                            simulatedValue={
                                userHaiVeloBoostData.myBoost !== userHaiVeloBoostData.simulatedBoostAfterDeposit
                                    ? `${formatNumberWithStyle(
                                        Number(userHaiVeloBoostData.simulatedBoostAfterDeposit),
                                        {
                                            minDecimals: 0,
                                            maxDecimals: 2,
                                            scalingFactor: 1,
                                        }
                                    )}x`
                                    : ''
                            }
                            tooltip={'The amount of Boost you get for rewards over your haiVELO position'}
                        />
                    </>
                ) : null}
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
        &:nth-child(6) {
            grid-column: 1 / 7;
        }
        &:nth-child(7) {
            grid-column: 1 / 3;
        }
        &:nth-child(8) {
            grid-column: 3 / 5;
        }
        &:nth-child(9) {
            grid-column: 5 / 7;
        }
    }
    &::after {
        border-top: none;
        border-right: none;
    }

    ${({ theme }) => theme.mediaWidth.upToMedium`
        & > * {
            &:nth-child(1), 
            &:nth-child(2), 
            &:nth-child(6) {
                grid-column: 1 / -1;
            }
            &:nth-child(7),
            &:nth-child(8),
            &:nth-child(9) {
                grid-column: 1 / -1;
            }
            padding: 12px;
        }
    `}
`

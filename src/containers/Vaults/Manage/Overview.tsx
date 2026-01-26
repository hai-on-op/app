/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCollateralLabel, Status, VaultAction, formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
// import { useEarnStrategies } from '~/hooks'
import { useBoost } from '~/hooks/useBoost'
import { RewardsModel } from '~/model/rewardsModel'
import { useUnderlyingAPR } from '~/hooks/useUnderlyingAPR'

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
    // Top-level APR hook to satisfy Rules of Hooks
    const underlyingAPRHook = useUnderlyingAPR({ collateralType: collateral.name })
    const underlyingAPRValue = underlyingAPRHook.underlyingAPR

    // --- Generalized boost logic for all boostable vaults ---
    const { individualVaultBoosts, hvBoost } = useBoost()
    const boostData = individualVaultBoosts[collateral.name]
    const rewards = RewardsModel.getVaultRewards(collateral.name)
    const isBoostable = Object.values(rewards).some((v) => v > 0)

    // Calculate stKITE share for all boostable vaults
    const totalKite = Object.values(usersStakingData).reduce((acc, curr) => acc + Number(curr.stakedBalance), 0)
    const myStKiteShare = totalKite
        ? Number(usersStakingData[address?.toLowerCase() || '']?.stakedBalance || 0) / totalKite
        : 0
    // Calculate my vault share (user's value in this vault / total value in all boostable vaults of this type)
    const myVaultShare =
        boostData && boostData.myValueParticipating && boostData.totalBoostedValueParticipating
            ? Number(boostData.myValueParticipating) / Number(boostData.totalBoostedValueParticipating || 1)
            : 0

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
                {/*<StatusLabel
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
                </StatusLabel>*/}
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

                {/* Calculate Net APR: (underlying APR + minting incentives APR) - stability fee */}
                {(() => {
                    const isHaiVelo = collateral.name === 'HAIVELO' || collateral.name === 'HAIVELOV2' || collateral.name === 'HAIAERO'
                    const underlyingAPR = isHaiVelo ? underlyingAPRValue * (hvBoost || 1) : underlyingAPRValue
                    const mintingIncentivesAPR = boostData?.myBoostedAPR ? boostData.myBoostedAPR / 100 : 0
                    const stabilityFeeCost = -parseFloat(summary.stabilityFee.raw || '0') // Use raw value directly as negative cost

                    let netAPR: number = 0
                    let calculationMethod: string = ''
                    let simulatedNetAPR: number | undefined = undefined

                    // For new vaults, check if user has input actual values
                    if (action === VaultAction.CREATE || !vault?.id) {
                        // Check if user has entered actual deposit and borrow amounts
                        const hasUserInputs =
                            formState.deposit &&
                            formState.borrow &&
                            Number(formState.deposit) > 0 &&
                            Number(formState.borrow) > 0

                        if (hasUserInputs) {
                            // Use actual user inputs to calculate Net APR
                            const collateralUsdValue = parseFloat(
                                summary.collateral.after?.usdFormatted?.replace(/[$,]/g, '') || '0'
                            )
                            const debtUsdValue = parseFloat(
                                summary.debt.after?.usdFormatted?.replace(/[$,]/g, '') || '0'
                            )

                            if (collateralUsdValue > 0) {
                                // Collateral side: earns underlying APR
                                const collateralYield = collateralUsdValue * underlyingAPR

                                // Debt side: earns minting incentives but pays stability fee
                                const debtNetAPR = mintingIncentivesAPR + stabilityFeeCost
                                const debtNetYield = debtUsdValue * debtNetAPR

                                // Total annual yield from the position
                                const totalYield = collateralYield + debtNetYield

                                // Net APR weighted by total position value (collateral + debt)
                                const totalPositionValue = collateralUsdValue + debtUsdValue
                                netAPR = totalPositionValue > 0 ? totalYield / totalPositionValue : 0
                                calculationMethod = `Based on your inputs - Collateral yield: $${collateralYield.toFixed(
                                    2
                                )}/year + Debt net yield: $${debtNetYield.toFixed(2)}/year = $${totalYield.toFixed(
                                    2
                                )}/year on $${collateralUsdValue.toLocaleString()} collateral`
                            } else {
                                // Fallback to simple addition if no USD values available
                                netAPR = underlyingAPR + mintingIncentivesAPR + stabilityFeeCost
                                calculationMethod = 'Simple addition (fallback)'
                            }
                        } else {
                            // No user inputs yet, use assumed typical ratio
                            const assumedCollateralRatio = 2.0 // 200%
                            const assumedCollateralValue = assumedCollateralRatio // e.g., $2
                            const assumedDebtValue = 1 // e.g., $1

                            // Calculate yields based on assumed position
                            const collateralYield = assumedCollateralValue * underlyingAPR
                            const debtNetAPR = mintingIncentivesAPR + stabilityFeeCost
                            const debtNetYield = assumedDebtValue * debtNetAPR
                            const totalYield = collateralYield + debtNetYield

                            // Net APR weighted by total position value (collateral + debt)
                            const assumedTotalPositionValue = assumedCollateralValue + assumedDebtValue
                            netAPR = assumedTotalPositionValue > 0 ? totalYield / assumedTotalPositionValue : 0
                            calculationMethod = `Estimated for 200% collateral ratio: $${collateralYield.toFixed(
                                2
                            )} collateral yield + $${debtNetYield.toFixed(2)} debt net yield = $${totalYield.toFixed(
                                2
                            )} per $${assumedCollateralValue} collateral`
                        }
                    } else {
                        // For existing vaults, use weighted average based on USD values
                        const collateralUsdValue = parseFloat(
                            summary.collateral.current?.usdFormatted?.replace(/[$,]/g, '') || '0'
                        )
                        const debtUsdValue = parseFloat(summary.debt.current?.usdFormatted?.replace(/[$,]/g, '') || '0')
                        if (collateralUsdValue > 0) {
                            // Collateral side: earns underlying APR
                            const collateralYield = collateralUsdValue * underlyingAPR

                            // Debt side: earns minting incentives but pays stability fee
                            const debtNetAPR = mintingIncentivesAPR + stabilityFeeCost // Note: stabilityFeeCost is already negative
                            const debtNetYield = debtUsdValue * debtNetAPR

                            // Total annual yield from the position
                            const totalYield = collateralYield + debtNetYield

                            // Net APR weighted by total position value (collateral + debt)
                            const totalPositionValue = collateralUsdValue + debtUsdValue
                            netAPR = totalPositionValue > 0 ? totalYield / totalPositionValue : 0
                            calculationMethod = `Collateral yield: $${collateralYield.toFixed(
                                2
                            )}/year + Debt net yield: $${debtNetYield.toFixed(2)}/year = $${totalYield.toFixed(
                                2
                            )}/year on $${collateralUsdValue.toLocaleString()} collateral`

                            // Calculate simulated Net APR if there's an active simulation
                            if (simulation && (simulation.collateral || simulation.debt)) {
                                // Calculate simulated USD values after the transaction
                                const simulatedCollateralUsdValue = parseFloat(
                                    summary.collateral.after?.usdFormatted?.replace(/[$,]/g, '') || '0'
                                )
                                const simulatedDebtUsdValue = parseFloat(
                                    summary.debt.after?.usdFormatted?.replace(/[$,]/g, '') || '0'
                                )

                                if (simulatedCollateralUsdValue > 0) {
                                    // For simulation, the amounts affect the net APR calculation but not the individual APR percentages
                                    // The underlying APR doesn't change based on amount (it's a percentage)
                                    // The minting incentives APR also doesn't change based on amount (it's a percentage)
                                    // What changes is the weighted calculation based on new collateral and debt amounts

                                    const simulatedCollateralYield = simulatedCollateralUsdValue * underlyingAPR
                                    const simulatedDebtNetYield = simulatedDebtUsdValue * debtNetAPR
                                    const simulatedTotalYield = simulatedCollateralYield + simulatedDebtNetYield

                                    const simulatedTotalPositionValue =
                                        simulatedCollateralUsdValue + simulatedDebtUsdValue
                                    simulatedNetAPR =
                                        simulatedTotalPositionValue > 0
                                            ? simulatedTotalYield / simulatedTotalPositionValue
                                            : 0
                                }
                            }
                        } else {
                            // Fallback to simple addition if no position values
                            netAPR = underlyingAPR + mintingIncentivesAPR + stabilityFeeCost
                            calculationMethod = 'Simple addition (fallback)'
                        }
                    }

                    // Check if this collateral type should show Net APR (has underlying yield or minting incentives)
                    const hasUnderlyingYield = underlyingAPR > 0
                    const hasMintingIncentives = mintingIncentivesAPR > 0
                    const shouldShowNetAPR = hasUnderlyingYield || hasMintingIncentives

                    const tooltipText = shouldShowNetAPR ? (
                        <Flex $column $gap={4}>
                            <Text>
                                Underlying APR:{' '}
                                {formatNumberWithStyle(underlyingAPR, { style: 'percent', maxDecimals: 2 })}
                            </Text>
                            <Text>
                                Minting Incentives:{' '}
                                {formatNumberWithStyle(mintingIncentivesAPR, { style: 'percent', maxDecimals: 2 })}
                            </Text>
                            <Text>
                                Stability Fee Cost:{' '}
                                {formatNumberWithStyle(stabilityFeeCost, { style: 'percent', maxDecimals: 2 })}
                            </Text>
                            <Text $fontWeight={700}>
                                Net APR: {formatNumberWithStyle(netAPR, { style: 'percent', maxDecimals: 2 })}
                            </Text>
                            <Text $fontSize="12px" $color="black">
                                Net APR is weighted by your total position value (collateral + debt).
                            </Text>
                        </Flex>
                    ) : (
                        `Stability Fee: ${formatNumberWithStyle(stabilityFeeCost, {
                            style: 'percent',
                            maxDecimals: 2,
                        })}`
                    )

                    return (
                        <OverviewStat
                            value={formatNumberWithStyle(shouldShowNetAPR ? netAPR : stabilityFeeCost, {
                                style: 'percent',
                                maxDecimals: 2,
                            })}
                            label={shouldShowNetAPR ? 'Net APR' : 'Stability Fee'}
                            tooltip={tooltipText}
                            simulatedValue={
                                shouldShowNetAPR &&
                                simulatedNetAPR !== undefined &&
                                Math.abs(simulatedNetAPR - netAPR) > 0.0001
                                    ? formatNumberWithStyle(simulatedNetAPR, {
                                          style: 'percent',
                                          maxDecimals: 2,
                                      })
                                    : undefined
                            }
                        />
                    )
                })()}

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
                {/* Show boost stats: for haiVELO use the original block, for other boostable vaults use the generalized block */}
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
                ) : isBoostable && boostData ? (
                    <>
                        <OverviewStat
                            value={formatNumberWithStyle(myStKiteShare, {
                                minDecimals: 2,
                                maxDecimals: 2,
                                scalingFactor: 1,
                                style: 'percent',
                            })}
                            label="My stKITE Share"
                            button={
                                boostData.myBoost === 2
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
                            value={formatNumberWithStyle(myVaultShare, {
                                minDecimals: 0,
                                maxDecimals: 2,
                                scalingFactor: 1,
                                style: 'percent',
                            })}
                            label={`My ${collateral.name} Share`}
                            tooltip={`The amount of ${collateral.name} you have in comparison to the total ${collateral.name} supply in all boostable vaults`}
                        />
                        <OverviewStat
                            value={`${formatNumberWithStyle(Number(boostData.myBoost), {
                                minDecimals: 0,
                                maxDecimals: 2,
                                scalingFactor: 1,
                            })}x`}
                            label="Boost"
                            tooltip={`The amount of Boost you get for rewards over your ${collateral.name} position`}
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

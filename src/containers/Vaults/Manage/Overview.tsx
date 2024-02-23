import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Status, VaultAction, formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'

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

    const { action, vault, collateral, riskStatus, safetyRatio, collateralRatio, simulation, summary } = useVault()

    const progressProps = useMemo(() => {
        if (!collateralRatio || !safetyRatio)
            return {
                progress: {
                    progress: 0,
                    label: '0%',
                },
                colorLimits: [0, 0.5, 1] as [number, number, number],
            }

        const MAX_FACTOR = 2.5

        const min = safetyRatio
        const max = min * MAX_FACTOR
        const labels = [
            {
                progress: 1 / MAX_FACTOR,
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
                        <Text>{`${Math.floor(1.5 * min)}%`}</Text>
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
                        <Text>{`${Math.floor(2.2 * min)}%`}</Text>
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
    }, [action, collateralRatio, safetyRatio, simulation?.collateralRatio])

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
                <Flex $justify="flex-end" $align="center" $gap={12} $fontSize="0.8em">
                    <Text>
                        {collateral.name}:&nbsp;
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
                    label="Locked Collateral"
                    convertedValue={summary.collateral.current?.usdFormatted || summary.collateral.after.usdFormatted}
                    simulatedValue={vault && simulation?.collateral ? summary.collateral.after.formatted : ''}
                    fullWidth
                />
                <OverviewStat
                    value={summary.debt.current?.formatted || summary.debt.after.formatted}
                    token="HAI"
                    label="Minted HAI Debt"
                    convertedValue={summary.debt.current?.usdFormatted || summary.debt.after.usdFormatted}
                    simulatedValue={vault && simulation?.debt ? summary.debt.after.formatted : ''}
                    alert={{
                        value: '7.2% Rewards APY',
                        status: Status.NEGATIVE,
                    }}
                    fullWidth
                />
                <OverviewStat
                    value={summary.stabilityFee.formatted}
                    label="Stability Fee"
                    tooltip={t('stability_fee_tip')}
                />
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
                    tooltip={`Collateral ratio under which this Vault can get liquidated`}
                />
                <OverviewStat
                    value={summary.liquidationPrice.current?.formatted || summary.liquidationPrice.after.formatted}
                    label="Liq. Price"
                    simulatedValue={
                        vault && simulation?.liquidationPrice ? summary.liquidationPrice.after.formatted : undefined
                    }
                    tooltip={t('liquidation_price_tip')}
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
    height: 60px;
    padding: 24px 0px;
`

const Inner = styled(Grid).attrs((props) => ({
    $width: '100%',
    $columns: '1fr 1fr 1fr',
    $align: 'stretch',
    ...props,
}))<DashedContainerProps>`
    ${DashedContainerStyle}
    & > * {
        padding: 24px;
    }
    &::after {
        border-top: none;
        border-right: none;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        & > * {
            padding: 12px;
        }
    `}
`

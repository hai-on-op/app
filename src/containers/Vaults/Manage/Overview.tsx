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
                <StatusLabel status={Status.NEGATIVE}>
                    {apy
                        ? formatNumberWithStyle(apy, {
                              minDecimals: 1,
                              maxDecimals: 1,
                              style: 'percent',
                              scalingFactor: 100,
                              suffixed: true,
                          })
                        : '--%'}{' '}
                    Rewards APY
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

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { type QueriedVault, formatNumberWithStyle, getRatePercentage } from '~/utils'
import { useStoreState } from '~/store'
import { useBoost } from '~/hooks/useBoost'
import { RewardsModel } from '~/model/rewardsModel'
import { useUnderlyingAPR } from '~/hooks/useUnderlyingAPR'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text, CenteredFlex } from '~/styles'
import { OverviewProgressStat, OverviewStat } from '../Manage/OverviewStat'
import { AlertTriangle, ArrowLeft, ArrowRight } from 'react-feather'

type OverviewProps = {
    vault?: QueriedVault
}
export function Overview({ vault }: OverviewProps) {
    const { t } = useTranslation()

    const { vaultModel: vaultState } = useStoreState((state) => state)

    const haiPrice = parseFloat(vaultState.liquidationData?.currentRedemptionPrice || '1')
    const collateralPrice = parseFloat(vault?.collateralType.currentPrice.value || '0')

    // Get boost data for net APR calculation
    const { individualVaultBoosts } = useBoost()
    const boostData = vault ? individualVaultBoosts[vault.collateralToken] : null

    const progressProps = useMemo(() => {
        if (!vault)
            return {
                progress: {
                    progress: 0,
                    label: '0%',
                },
                colorLimits: [0, 0.5, 1] as [number, number, number],
            }

        const { safetyCRatio, liquidationCRatio } = vault.liquidationData
        const safetyRatio = safetyCRatio ? 100 * parseFloat(safetyCRatio.toString()) : undefined
        if (!vault.collateralRatio || !safetyRatio || !liquidationCRatio)
            return {
                progress: {
                    progress: 0,
                    label: '0%',
                },
                colorLimits: [0, 0.5, 1] as [number, number, number],
            }

        const MAX_FACTOR = 2.5

        const min = 100 * parseFloat(liquidationCRatio)
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

        return {
            progress: {
                progress: Math.min(parseFloat(vault.collateralRatio), max) / max,
                label: formatNumberWithStyle(vault.collateralRatio, {
                    maxDecimals: 1,
                    scalingFactor: 0.01,
                    style: 'percent',
                }),
            },
            labels,
            colorLimits: labels.map(({ progress }) => progress) as [number, number, number],
        }
    }, [vault])

    return (
        <Container>
            <Header>
                <Text $fontWeight={700}>Details</Text>
            </Header>
            <Inner $borderOpacity={0.2}>
                <OverviewStat
                    value={vault ? formatNumberWithStyle(vault.collateral) : '--'}
                    token={(vault?.collateralToken || '???') as any}
                    label="Locked Collateral"
                    convertedValue={
                        vault && collateralPrice
                            ? formatNumberWithStyle(parseFloat(vault.collateral) * collateralPrice, {
                                  style: 'currency',
                              })
                            : '$--'
                    }
                    labelOnTop
                />
                <OverviewStat
                    value={vault ? formatNumberWithStyle(vault.totalDebt) : '--'}
                    token="HAI"
                    label="Minted HAI Debt"
                    convertedValue={
                        vault
                            ? formatNumberWithStyle(parseFloat(vault.totalDebt) * haiPrice, { style: 'currency' })
                            : '$--'
                    }
                    labelOnTop
                />
                <OverviewProgressStat
                    value={
                        vault
                            ? formatNumberWithStyle(vault.collateralRatio, {
                                  scalingFactor: 0.01,
                                  style: 'percent',
                              })
                            : '--%'
                    }
                    label="Collateral Ratio:"
                    alert={vault?.status ? { status: vault.status } : undefined}
                    {...progressProps}
                    fullWidth
                />
                <OverviewStat
                    value={vault ? formatNumberWithStyle(vault.liquidationPrice, { style: 'currency' }) : '$--'}
                    label="Liq. Price"
                    tooltip={t('liquidation_price_tip')}
                />

                {/* Calculate Net APR: minting incentives APR - stability fee */}
                {(() => {
                    if (!vault)
                        return <OverviewStat value="--" label="Net APR" tooltip="Net APR calculation unavailable" />

                    const { underlyingAPR } = useUnderlyingAPR({ collateralType: vault.collateralToken })
                    const mintingIncentivesAPR = boostData?.myBoostedAPR ? boostData.myBoostedAPR / 100 : 0
                    const stabilityFeeCost = -getRatePercentage(
                        vault.liquidationData.totalAnnualizedStabilityFee || '1',
                        4,
                        true
                    )

                    // For VaultById, we always have an existing vault, so use weighted average
                    let netAPR: number = 0
                    let calculationMethod: string = ''
                    let simulatedNetAPR: number | undefined = undefined

                    const collateralUsdValue =
                        parseFloat(vault.collateral || '0') *
                        parseFloat(vault.liquidationData.currentPrice?.value || '0')
                    const debtUsdValue = parseFloat(vault.debt || '0') // HAI is approximately $1
                    if (collateralUsdValue > 0) {
                        // Collateral side: earns underlying APR
                        const collateralYield = collateralUsdValue * underlyingAPR

                        // Debt side: earns minting incentives but pays stability fee
                        const debtNetAPR = mintingIncentivesAPR + stabilityFeeCost // Note: stabilityFeeCost is already negative
                        const debtNetYield = debtUsdValue * debtNetAPR

                        // Total annual yield from the position
                        const totalYield = collateralYield + debtNetYield

                        // Net APR based on collateral value (what user is risking)
                        netAPR = totalYield / collateralUsdValue
                        calculationMethod = `Collateral yield: $${collateralYield.toFixed(
                            2
                        )}/year + Debt net yield: $${debtNetYield.toFixed(2)}/year = $${totalYield.toFixed(
                            2
                        )}/year on $${collateralUsdValue.toLocaleString()} collateral`

                        // Note: VaultById page is read-only, so no simulation needed here
                        // Simulation is only relevant in the Manage view where users can input amounts
                    } else {
                        // Fallback to simple addition if no position values
                        netAPR = underlyingAPR + mintingIncentivesAPR + stabilityFeeCost
                        calculationMethod = 'Simple addition (fallback)'
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
                                Net APR is expressed in terms of your collateral value.
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
                        />
                    )
                })()}
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
}))`
    padding: 48px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
    `}
`
const Header = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    ...props,
}))`
    height: 60px;
    padding: 24px 0px;
`

const Inner = styled(Grid).attrs((props) => ({
    $width: '100%',
    $columns: '1fr 1fr',
    $align: 'center',
    ...props,
}))<DashedContainerProps>`
    ${DashedContainerStyle}
    & > * {
        padding: 24px;
        min-height: 100px;
    }
    &::after {
        border-top: none;
        border-right: none;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr;
    `}
`

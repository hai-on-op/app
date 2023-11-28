import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Status, formatNumberWithStyle } from '~/utils'
import { useVault } from '~/providers/VaultProvider'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text, CenteredFlex } from '~/styles'
import { Swirl } from '~/components/Icons/Swirl'
import { StatusLabel } from '~/components/StatusLabel'
import { OverviewProgressStat, OverviewStat } from './OverviewStat'

export function Overview() {
    const { t } = useTranslation()

    const {
        vault,
        collateralName,
        totalCollateral,
        totalDebt,
        riskStatus,
        parsedCR,
        safetyCR,
        stabilityFeePercentage,
        liquidationPrice,
        simulation
    } = useVault()

    const progressProps = useMemo(() => {
        if (!parsedCR || !safetyCR) return {
            progress: 0
        }

        const MAX_FACTOR = 2.5

        const min = safetyCR
        const max = min * MAX_FACTOR
        const labels = [
            { progress: 1 / MAX_FACTOR, label: `${Math.floor(min)}%` },
            { progress: 1.5 / MAX_FACTOR, label: `${Math.floor(1.5 * min)}%` },
            { progress: 2.2 / MAX_FACTOR, label: `${Math.floor(2.2 * min)}%` }
        ]
        
        return {
            progress: Math.min(parsedCR, max) / max,
            labels,
            colorLimits: [100 / max, 2 / MAX_FACTOR] as [number, number]
        }
    }, [parsedCR, safetyCR])

    return (
        <Container>
            <Header>
                <Text $fontWeight={700}>Vault Overview {vault ? `#${vault.id}`: ''}</Text>
                {!!simulation && (
                    <StatusLabel
                        status={Status.CUSTOM}
                        background="gradient">
                        <CenteredFlex $gap={8}>
                            <Swirl size={14}/>
                            <Text
                                $fontSize="0.67rem"
                                $fontWeight={700}>
                                Simulation
                            </Text>
                        </CenteredFlex>
                    </StatusLabel>
                )}
            </Header>
            <Inner $borderOpacity={0.2}>
                <OverviewStat
                    value={vault?.collateral
                        ? formatNumberWithStyle(vault.collateral, { maxDecimals: 4 })
                        : formatNumberWithStyle(totalCollateral.toString(), { maxDecimals: 4 })
                    }
                    token={collateralName as any}
                    label="Collateral Asset"
                    simulatedValue={vault && simulation?.collateral
                        ? formatNumberWithStyle(totalCollateral.toString(), { maxDecimals: 4 })
                        : ''
                    }
                    alert={{
                        value: '7.2% APY',
                        status: Status.POSITIVE
                    }}
                    fullWidth
                    borderedBottom
                />
                <OverviewStat
                    value={vault?.debt
                        ? formatNumberWithStyle(vault.debt, { maxDecimals: 4 })
                        : formatNumberWithStyle(totalDebt.toString(), { maxDecimals: 4 })
                    }
                    token="HAI"
                    label="Debt Asset"
                    simulatedValue={vault && simulation?.debt
                        ? formatNumberWithStyle(totalDebt.toString(), { maxDecimals: 4 })
                        : ''
                    }
                    alert={{
                        value: '-7.2% APY',
                        status: Status.NEGATIVE
                    }}
                    fullWidth
                    borderedBottom
                />
                <OverviewProgressStat
                    value={typeof parsedCR === 'undefined'
                        ? '--%'
                        : formatNumberWithStyle(parsedCR, {
                            scalingFactor: 0.01,
                            style: 'percent'
                        })
                    }
                    label="Ratio:"
                    simulatedValue={vault && simulation?.riskStatus
                        ? `${simulation.collateralRatio
                            ? formatNumberWithStyle(simulation.collateralRatio, {
                                scalingFactor: 0.01,
                                style: 'percent'
                            })
                            : '--'
                        } ${simulation.riskStatus}`
                        : undefined
                    }
                    alert={riskStatus ? { status: riskStatus }: undefined}
                    {...progressProps}
                    fullWidth
                    borderedBottom
                />
                {/* <OverviewStat
                    value={(singleSafe?.collateralRatio || vaultInfo.collateralRatio).toString() + '%'}
                    label="CF"
                    tooltip="Hello world"
                    borderedBottom
                    borderedRight
                /> */}
                <OverviewStat
                    value={vault?.totalAnnualizedStabilityFee
                        ? formatNumberWithStyle(vault.totalAnnualizedStabilityFee, {
                            // scalingFactor: 0.01,
                            maxDecimals: 4,
                            style: 'percent'
                        })
                        : formatNumberWithStyle(stabilityFeePercentage, {
                            scalingFactor: 0.01,
                            maxDecimals: 4,
                            style: 'percent'
                        })
                    }
                    label="Stability Fee"
                    tooltip={t('stability_fee_tip')}
                    borderedRight
                />
                <OverviewStat
                    value={formatNumberWithStyle(vault?.liquidationPrice || liquidationPrice.toString(), {
                        maxDecimals: 3,
                        style: 'currency'
                    })}
                    label="Liq. Price"
                    simulatedValue={vault && simulation?.liquidationPrice
                        ? formatNumberWithStyle(simulation.liquidationPrice, {
                            maxDecimals: 3,
                            style: 'currency'
                        })
                        : undefined
                    }
                    tooltip={t('liquidation_price_tip')}
                />
                {/* <OverviewStat
                    value={parseFloat((100 * parseFloat(singleSafe?.totalAnnualizedStabilityFee || '0')).toFixed(2)) + '%'}
                    label="Rewards APY"
                    tooltip="Hello world"
                /> */}
            </Inner>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    ...props
}))`
    max-width: 560px;
`
const Header = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    ...props
}))`
    height: 60px;
    padding: 24px 0px;
`

const Inner = styled(Grid).attrs(props => ({
    $width: '100%',
    $columns: '1fr 1fr',
    $align: 'center',
    ...props
}))<DashedContainerProps>`
    ${DashedContainerStyle}
    & > * {
        padding: 24px;
        min-height: 100px;
    }
`

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Status } from '~/utils'
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
        collateral,
        riskStatus,
        safetyRatio,
        collateralRatio,
        simulation,
        summary,
    } = useVault()

    const progressProps = useMemo(() => {
        if (!collateralRatio || !safetyRatio) return {
            progress: 0,
        }

        const MAX_FACTOR = 2.5

        const min = safetyRatio
        const max = min * MAX_FACTOR
        const labels = [
            { progress: 1 / MAX_FACTOR, label: `${Math.floor(min)}%` },
            { progress: 1.5 / MAX_FACTOR, label: `${Math.floor(1.5 * min)}%` },
            { progress: 2.2 / MAX_FACTOR, label: `${Math.floor(2.2 * min)}%` },
        ]
        
        return {
            progress: Math.min(parseFloat(collateralRatio), max) / max,
            simulatedProgress: simulation?.collateralRatio
                ? Math.min(parseFloat(simulation.collateralRatio), max) / max
                : undefined,
            labels,
            colorLimits: [100 / max, 2 / MAX_FACTOR] as [number, number],
        }
    }, [collateralRatio, safetyRatio, simulation?.collateralRatio])

    return (
        <Container>
            <Header>
                <Text $fontWeight={700}>
                    Vault Overview {vault ? `#${vault.id}`: ''}
                </Text>
                {!!simulation && !!vault && (
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
                    value={
                        summary.collateral.current?.formatted
                        || summary.collateral.after.formatted
                    }
                    token={collateral.name as any}
                    label="Collateral Asset"
                    convertedValue={
                        summary.collateral.current?.usdFormatted
                        || summary.collateral.after.usdFormatted
                    }
                    simulatedValue={vault && simulation?.collateral
                        ? summary.collateral.after.formatted
                        : ''
                    }
                    fullWidth
                />
                <OverviewStat
                    value={
                        summary.debt.current?.formatted
                        || summary.debt.after.formatted
                    }
                    token="HAI"
                    label="Debt Asset"
                    convertedValue={
                        summary.debt.current?.usdFormatted
                        || summary.debt.after.usdFormatted
                    }
                    simulatedValue={vault && simulation?.debt
                        ? summary.debt.after.formatted
                        : ''
                    }
                    alert={{
                        value: '7.2% Rewards APY',
                        status: Status.NEGATIVE,
                    }}
                    fullWidth
                />
                <OverviewProgressStat
                    value={
                        summary.collateralRatio.current?.formatted
                        || summary.collateralRatio.after.formatted
                    }
                    label="Ratio:"
                    simulatedValue={vault && simulation?.riskStatus
                        ? `${simulation.collateralRatio
                            ? summary.collateralRatio.after.formatted
                            : '--%'
                        } (${simulation.riskStatus})`
                        : undefined
                    }
                    alert={riskStatus ? { status: riskStatus }: undefined}
                    {...progressProps}
                    fullWidth
                />
                <OverviewStat
                    value={summary.stabilityFee.formatted}
                    label="Stability Fee"
                    tooltip={t('stability_fee_tip')}
                />
                <OverviewStat
                    value={
                        summary.liquidationPrice.current?.formatted
                        || summary.liquidationPrice.after.formatted
                    }
                    label="Liq. Price"
                    simulatedValue={vault && simulation?.liquidationPrice
                        ? summary.liquidationPrice.after.formatted
                        : undefined
                    }
                    tooltip={t('liquidation_price_tip')}
                />
                {/* <OverviewStat
                    value={parseFloat((100 * parseFloat(vault?.totalAnnualizedStabilityFee || '0')).toFixed(2)) + '%'}
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
    ...props,
}))``
const Header = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    ...props,
}))`
    height: 60px;
    padding: 24px 0px;
`

const Inner = styled(Grid).attrs(props => ({
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
`

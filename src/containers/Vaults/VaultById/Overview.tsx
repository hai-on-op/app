import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { type QueriedVault, formatNumberWithStyle, getRatePercentage } from '~/utils'
import { useStoreState } from '~/store'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text } from '~/styles'
import { OverviewProgressStat, OverviewStat } from '../Manage/OverviewStat'

type OverviewProps = {
    vault?: QueriedVault
}
export function Overview({ vault }: OverviewProps) {
    const { t } = useTranslation()

    const { vaultModel: vaultState } = useStoreState(state => state)
    
    const haiPrice = parseFloat(vaultState.liquidationData?.currentRedemptionPrice || '1')
    const collateralPrice = parseFloat(vault?.collateralType.currentPrice.value || '0')

    const progressProps = useMemo(() => {
        if (!vault) return { progress: 0 }

        const { safetyCRatio } = vault.liquidationData
        const safetyRatio = safetyCRatio
            ? 100 * parseFloat(safetyCRatio.toString())
            : undefined
        if (!vault.collateralRatio || !safetyRatio) return {
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
            progress: Math.min(parseFloat(vault.collateralRatio), max) / max,
            labels,
            colorLimits: [100 / max, 2 / MAX_FACTOR] as [number, number],
        }
    }, [vault])

    return (
        <Container>
            <Header>
                <Text $fontWeight={700}>Details</Text>
            </Header>
            <Inner $borderOpacity={0.2}>
                <OverviewStat
                    value={vault
                        ? formatNumberWithStyle(vault.collateral)
                        : '--'
                    }
                    token={(vault?.collateralToken || '???') as any}
                    label="Collateral Asset"
                    convertedValue={vault && collateralPrice
                        ? formatNumberWithStyle(
                            parseFloat(vault.collateral) * collateralPrice,
                            { style: 'currency' }
                        )
                        : '$--'
                    }
                />
                <OverviewStat
                    value={vault
                        ? formatNumberWithStyle(vault.debt)
                        : '--'
                    }
                    token="HAI"
                    label="Debt Asset"
                    convertedValue={vault
                        ? formatNumberWithStyle(
                            parseFloat(vault.debt) * haiPrice,
                            { style: 'currency' }
                        )
                        : '$--'
                    }
                />
                <OverviewProgressStat
                    value={vault
                        ? formatNumberWithStyle(vault.collateralRatio, {
                            scalingFactor: 0.01,
                            style: 'percent',
                        })
                        : '--%'
                    }
                    label="Ratio:"
                    alert={vault?.status ? { status: vault.status }: undefined}
                    {...progressProps}
                    fullWidth
                />
                <OverviewStat
                    value={vault
                        ? formatNumberWithStyle(
                            (getRatePercentage(
                                vault.liquidationData.totalAnnualizedStabilityFee || '0',
                                4,
                                true
                            )).toString(),
                            { style: 'percent' }
                        )
                        : '--%'
                    }
                    label="Stability Fee"
                    tooltip={t('stability_fee_tip')}
                />
                <OverviewStat
                    value={vault
                        ? formatNumberWithStyle(vault.liquidationPrice, { style: 'currency' })
                        : '$--'
                    }
                    label="Liq. Price"
                    tooltip={t('liquidation_price_tip')}
                />
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
}))`
    padding: 48px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
    `}
`
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

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr;
    `}
`

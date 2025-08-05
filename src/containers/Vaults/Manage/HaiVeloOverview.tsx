import { useMemo } from 'react'
import { formatNumberWithStyle } from '~/utils'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text } from '~/styles'
import { OverviewProgressStat, OverviewStat } from './OverviewStat'
import { useHaiVeloV2 } from '~/hooks'

export function HaiVeloOverview() {
    // Use the new hook to fetch VELO and veVELO balances
    const { loading, error, veloBalanceFormatted, veVeloBalanceFormatted, totalVeloBalanceFormatted } = useHaiVeloV2()

    // Placeholder data - replace with actual hooks/data later
    const placeholderData = {
        myVelo: veloBalanceFormatted,
        myVeVelo: veVeloBalanceFormatted,
        myHaiVeloV1: '0.00', // TODO: Add haiVELO v1 balance hook
        myHaiVelo: '0.00', // TODO: Add haiVELO balance hook
        veloTVL: '1,234,567.89',
        netRewardsAPR: '12.34',
        performanceFee: '2.5',
        totalHaiVeloDeposited: '456,789.12',
        totalHaiVeloCapacity: '1,000,000.00',
        // Price data
        veloPrice: '0.1234',
        haiVeloPrice: '0.9876',
        pegPercentage: '99.8',
    }

    // Calculate progress for hai velo deposited
    const haiVeloProgress = useMemo(() => {
        const deposited = parseFloat(placeholderData.totalHaiVeloDeposited.replace(/,/g, ''))
        const capacity = parseFloat(placeholderData.totalHaiVeloCapacity.replace(/,/g, ''))
        const progress = capacity > 0 ? deposited / capacity : 0
        const progressPercentage = Math.min(progress * 100, 100)

        return {
            simpleProgress: Math.min(progress, 1),
            progressPercentage: progressPercentage.toFixed(1),
        }
    }, [placeholderData.totalHaiVeloDeposited, placeholderData.totalHaiVeloCapacity])

    return (
        <Container>
            <Header>
                <Flex $justify="flex-start" $align="center" $gap={12}>
                    <Text $fontWeight={700}>haiVELO Overview</Text>
                    {loading && (
                        <Text $color="rgba(0,0,0,0.5)" $fontSize="0.8em">
                            Loading balances...
                        </Text>
                    )}
                    {error && (
                        <Text $color="red" $fontSize="0.8em">
                            Error loading balances
                        </Text>
                    )}
                </Flex>
                <Flex $justify="flex-end" $align="center" $gap={12} $fontSize="0.8em">
                    <Text>
                        VELO:&nbsp;
                        <strong>
                            {placeholderData.veloPrice
                                ? formatNumberWithStyle(placeholderData.veloPrice, {
                                      minDecimals: 4,
                                      maxDecimals: 4,
                                      style: 'currency',
                                  })
                                : '--'}
                        </strong>
                    </Text>
                    <Text>
                        haiVELO:&nbsp;
                        <strong>
                            {placeholderData.haiVeloPrice
                                ? formatNumberWithStyle(placeholderData.haiVeloPrice, {
                                      minDecimals: 4,
                                      maxDecimals: 4,
                                      style: 'currency',
                                  })
                                : '--'}
                        </strong>
                    </Text>
                    <Text>
                        Peg:&nbsp;
                        <strong>
                            {placeholderData.pegPercentage
                                ? formatNumberWithStyle(placeholderData.pegPercentage, {
                                      minDecimals: 1,
                                      maxDecimals: 1,
                                      style: 'percent',
                                      scalingFactor: 0.01,
                                  })
                                : '--'}
                        </strong>
                    </Text>
                </Flex>
            </Header>
            <Inner $borderOpacity={0.2}>
                {/* Top section - My VELO/veVELO/haiVELO v1 details */}
                <OverviewStat
                    value={formatNumberWithStyle(placeholderData.myVelo, {
                        maxDecimals: 2,
                    })}
                    token="VELO"
                    tokenLabel="VELO"
                    label="My VELO, veVELO, haiVELO v1"
                    convertedValue="$0.00"
                    labelOnTop
                />

                {/* My haiVELO section */}
                <OverviewStat
                    value={formatNumberWithStyle(placeholderData.myHaiVelo, {
                        style: 'currency',
                        maxDecimals: 2,
                    })}
                    token="HAIVELO"
                    label="My haiVELO"
                    convertedValue="$0.00"
                    labelOnTop
                />

                {/* Middle section - VELO TVL, Net Rewards APR, Performance Fee */}
                <OverviewStat
                    value={formatNumberWithStyle(placeholderData.veloTVL, {
                        style: 'currency',
                        maxDecimals: 0,
                    })}
                    label="VELO TVL"
                    tooltip="Total Value Locked in VELO"
                />
                <OverviewStat
                    value={formatNumberWithStyle(placeholderData.netRewardsAPR, {
                        style: 'percent',
                        maxDecimals: 2,
                        scalingFactor: 0.01,
                    })}
                    label="Net Rewards APR"
                    tooltip="Annual Percentage Return from rewards after fees"
                />
                <OverviewStat
                    value={formatNumberWithStyle(placeholderData.performanceFee, {
                        style: 'percent',
                        maxDecimals: 1,
                        scalingFactor: 0.01,
                    })}
                    label="Performance Fee"
                    tooltip="Fee charged on performance"
                />

                {/* Progress bar section */}
                <OverviewProgressStat
                    value={`${haiVeloProgress.progressPercentage}%`}
                    label="Total haiVELO Deposited:"
                    variant="simple"
                    {...haiVeloProgress}
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
        /* Top section - Combined VELO section (left half) */
        &:nth-child(1) {
            grid-column: 1 / 4;
        }
        /* My haiVELO section (right half) */
        &:nth-child(2) {
            grid-column: 4 / 7;
        }
        /* Middle section - TVL, APR, Fee (2 columns each) */
        &:nth-child(3) {
            grid-column: 1 / 3;
        }
        &:nth-child(4) {
            grid-column: 3 / 5;
        }
        &:nth-child(5) {
            grid-column: 5 / 7;
        }
        /* Progress bar (full width) */
        &:nth-child(6) {
            grid-column: 1 / 7;
        }
    }
    &::after {
        border-top: none;
        border-right: none;
    }

    ${({ theme }) => theme.mediaWidth.upToMedium`
        & > * {
            grid-column: 1 / -1 !important;
            padding: 12px;
        }
    `}
`

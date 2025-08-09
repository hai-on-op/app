import { useMemo } from 'react'
import { formatNumberWithStyle, Status } from '~/utils'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text, CenteredFlex } from '~/styles'
import { OverviewProgressStat, OverviewStat } from './OverviewStat'
import { useHaiVeloV2 } from '~/hooks'
import { useHaiVelo } from '~/providers/HaiVeloProvider'
import { StatusLabel } from '~/components/StatusLabel'
import { Swirl } from '~/components/Icons/Swirl'

export function HaiVeloOverview() {
    // Use the new hook to fetch VELO and veVELO balances
    const {
        loading,
        error,
        veloBalanceFormatted,
        veVeloBalanceFormatted,
        totalVeloBalanceFormatted,
        haiVeloV1BalanceFormatted,
    } = useHaiVeloV2()

    // Simulation amount from haiVELO context (user input), used to show simulated values
    const { simulatedAmount } = useHaiVelo()




    // Placeholder data - replace with actual hooks/data later
    const placeholderData = {
        myVelo: veloBalanceFormatted,
        myVeVelo: veVeloBalanceFormatted,
        myTotalVelo: totalVeloBalanceFormatted, // Sum of VELO + veVELO (+ haiVELO v1 in hook formatting)
        myHaiVeloV1: haiVeloV1BalanceFormatted,
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

    // Calculate progress for hai velo deposited (with simulation overlay)
    const progressProps = useMemo(() => {
        const deposited = parseFloat(placeholderData.totalHaiVeloDeposited.replace(/,/g, ''))
        const capacity = parseFloat(placeholderData.totalHaiVeloCapacity.replace(/,/g, ''))

        const baseProgress = capacity > 0 ? Math.min(deposited / capacity, 1) : 0
        const baseLabel = `${(baseProgress * 100).toFixed(1)}%`

        const withSimDeposited = deposited + (simulatedAmount > 0 ? simulatedAmount : 0)
        const simProgress = capacity > 0 ? Math.min(withSimDeposited / capacity, 1) : 0
        const simLabel = `${(simProgress * 100).toFixed(1)}%`

        return {
            progress: { progress: baseProgress, label: baseLabel },
            simulatedProgress: simulatedAmount > 0 ? { 
                progress: simProgress, 
                label: `${(simProgress * 100).toFixed(1)}% After Tx` 
            } : undefined,
            colorLimits: [0, 0.5, 1] as [number, number, number],
            labels: [] // Empty labels for simple progress bar
        }
    }, [placeholderData.totalHaiVeloDeposited, placeholderData.totalHaiVeloCapacity, simulatedAmount])

    // Simulated first section (My VELO, veVELO, haiVELO v1): current - simulatedAmount
    const simulatedMyTotalVelo = useMemo(() => {
        const base = parseFloat(String(placeholderData.myTotalVelo).replace(/[$,]/g, '')) || 0
        const after = Math.max(base - (simulatedAmount > 0 ? simulatedAmount : 0), 0)
        return formatNumberWithStyle(after, { maxDecimals: 2 })
    }, [placeholderData.myTotalVelo, simulatedAmount])





    return (
        <Container>
            <Header>
                <Flex $justify="flex-start" $align="center" $gap={12}>
                    <Text $fontWeight={700}>haiVELO Overview</Text>
                    {simulatedAmount > 0 && (
                        <StatusLabel status={Status.CUSTOM} background="gradientCooler">
                            <CenteredFlex $gap={8}>
                                <Swirl size={14} />
                                <Text $fontSize="0.67rem" $fontWeight={700}>
                                    Simulation
                                </Text>
                            </CenteredFlex>
                        </StatusLabel>
                    )}
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
                    value={formatNumberWithStyle(placeholderData.myTotalVelo, {
                        maxDecimals: 2,
                    })}
                    token="VELO"
                    tokenLabel="VELO"
                    label="My VELO, veVELO, haiVELO v1"
                    convertedValue="$0.00"
                    simulatedValue={simulatedAmount > 0 ? simulatedMyTotalVelo : undefined}
                    labelOnTop
                />

                {/* My haiVELO section */}
                <OverviewStat
                    value={formatNumberWithStyle(parseFloat(placeholderData.myHaiVelo), {
                        maxDecimals: 2,
                    })}
                    token="HAIVELO"
                    label="My haiVELO"
                    convertedValue="$0.00"
                    simulatedValue={simulatedAmount > 0 ? formatNumberWithStyle(parseFloat(placeholderData.myHaiVelo) + simulatedAmount, { maxDecimals: 2 }) : undefined}
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

                {/* Progress bar section with simulation overlay */}
                <OverviewProgressStat
                    value={progressProps.progress.label}
                    label="Total haiVELO Deposited:"
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

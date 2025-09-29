import { useEffect, useMemo, useState } from 'react'
import { formatNumberWithStyle, Status , getRatePercentage } from '~/utils'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text, CenteredFlex } from '~/styles'
import { OverviewProgressStat, OverviewStat } from './OverviewStat'
import { useHaiVelo } from '~/providers/HaiVeloProvider'
import { StatusLabel } from '~/components/StatusLabel'
import { Swirl } from '~/components/Icons/Swirl'
import { useBoost } from '~/hooks/useBoost'
import { useUnderlyingAPR } from '~/hooks/useUnderlyingAPR'
import { useStoreState } from '~/store'
import { useAccount } from 'wagmi'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useHaiVeloAccount } from '~/hooks/haivelo/useHaiVeloAccount'
import { fetchV2Totals, fetchV2Safes } from '~/services/haivelo/dataSources'
import { useQuery } from '@tanstack/react-query'

export function HaiVeloOverview() {
    // Get all data and simulation state from the single context
    const {
        data: {
            loading,
            error,
            veloBalanceFormatted,
            veVeloBalanceFormatted,
            totalVeloBalanceFormatted,
            haiVeloV1BalanceFormatted,
            haiVeloV2BalanceFormatted,
        },
        simulatedAmount,
        simulatedDepositAmount,
    } = useHaiVelo()

    // Net Rewards APR (haiVELO vault): use combined haiVELO boost (v1+v2)
    const { hvBoost } = useBoost()
    const { underlyingAPR } = useUnderlyingAPR({ collateralType: 'HAIVELOV2' })
    const { vaultModel } = useStoreState((state) => state)
    const haiveloLiqData = vaultModel?.liquidationData?.collateralLiquidationData?.['HAIVELOV2']
    const stabilityFeeCost = haiveloLiqData
        ? -getRatePercentage(haiveloLiqData.totalAnnualizedStabilityFee || '1', 4, true)
        : 0
    const mintingIncentivesAPR = 0

    // Estimate Net APR using assumed 200% collateral ratio (same approach as Manage/Overview fallback)
    const assumedCollateralRatio = 2.0
    const assumedCollateralValue = assumedCollateralRatio
    const assumedDebtValue = 1
    const collateralYield = assumedCollateralValue * underlyingAPR
    const debtNetAPR = mintingIncentivesAPR + stabilityFeeCost
    const debtNetYield = assumedDebtValue * debtNetAPR
    const netAprDecimal =
        assumedCollateralValue + assumedDebtValue > 0
            ? (collateralYield + debtNetYield) / (assumedCollateralValue + assumedDebtValue)
            : underlyingAPR + stabilityFeeCost

    const { address } = useAccount()
    const addrLower = address?.toLowerCase()
    const { prices: veloPrices } = useVelodromePrices()
    const veloPrice = useMemo(() => Number(veloPrices?.VELO?.raw || 0), [veloPrices])
    const { v1Balance, v2Balance, velo, veNft } = useHaiVeloAccount(address || undefined)
    const { data: v2Safes } = useQuery({
        queryKey: ['haivelo', 'v2', 'safes-summary'],
        queryFn: async () => fetchV2Safes('HAIVELOV2'),
        staleTime: 5 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    })

    // My convertible VELO total (VELO + veVELO + haiVELO v1)
    const myConvertibleVeloTotal = useMemo(() => {
        const veloAmt = Number(velo?.formatted || '0')
        const veVeloAmt = Number(veNft?.totalFormatted || '0')
        const hv1Amt = Number(v1Balance || '0')
        return veloAmt + veVeloAmt + hv1Amt
    }, [velo?.formatted, veNft?.totalFormatted, v1Balance])

    // My haiVELO v2 in wallet (not deposited)
    const myHaiVeloV2Wallet = useMemo(() => Number(v2Balance?.formatted || '0'), [v2Balance?.formatted])

    const simulatedMyHaiVeloV2Wallet = useMemo(() => {
        if (!(simulatedAmount > 0)) return undefined
        return formatNumberWithStyle(simulatedDepositAmount || 0, { maxDecimals: 2 })
    }, [simulatedDepositAmount, simulatedAmount])

    // My deposit across all vaults (value): v2-only deposits * VELO price
    const myDepositValueUsd = useMemo(() => {
        if (!addrLower || !v2Safes?.safes) return 0
        const qty = v2Safes.safes
            .filter((s) => s.owner?.address?.toLowerCase() === addrLower)
            .reduce((acc, s) => acc + Number(s.collateral || '0'), 0)
        return qty * veloPrice
    }, [v2Safes, addrLower, veloPrice])

    // Deposit TVL (total value deposited as collateral)
    const depositTvlUsd = useMemo(() => {
        const totalQty = Number(v2Safes?.totalCollateral || '0')
        return totalQty * veloPrice
    }, [v2Safes, veloPrice])

    // Percent of v2 supply deposited as collateral
    const [v2Supply, setV2Supply] = useState<number>(0)
    useEffect(() => {
        let mounted = true
        const run = async () => {
            try {
                const totals = await fetchV2Totals()
                if (!mounted) return
                setV2Supply(Number(totals.totalSupplyFormatted || '0'))
            } catch {
                if (!mounted) return
                setV2Supply(0)
            }
        }
        run()
        return () => {
            mounted = false
        }
    }, [])
    const percentOfV2Deposited = useMemo(() => {
        const totalQty = Number(v2Safes?.totalCollateral || '0')
        if (!v2Supply || v2Supply <= 0) return '--%'
        const pct = (totalQty * 100) / v2Supply
        return formatNumberWithStyle(pct, { style: 'percent', suffixed: true, maxDecimals: 2 })
    }, [v2Safes, v2Supply])

    // Calculate progress for hai velo deposited (with simulation overlay)
    const progressProps = useMemo(() => {
        const totalDepositedQty = Number(v2Safes?.totalCollateral || '0')
        const supplyQty = v2Supply

        const baseProgress = supplyQty > 0 ? Math.min(totalDepositedQty / supplyQty, 1) : 0
        const baseLabel = formatNumberWithStyle(baseProgress * 100, { style: 'percent', suffixed: true, maxDecimals: 2 })

        const withSimQty = totalDepositedQty + (simulatedDepositAmount > 0 ? simulatedDepositAmount : 0)
        const simProgress = supplyQty > 0 ? Math.min(withSimQty / supplyQty, 1) : 0

        return {
            progress: { progress: baseProgress, label: baseLabel },
            simulatedProgress:
                simulatedAmount > 0
                    ? {
                        progress: simProgress,
                        label: `${(simProgress * 100).toFixed(1)}% After Tx`,
                    }
                    : undefined,
            colorLimits: [0, 0.5, 1] as [number, number, number],
            labels: [],
        }
    }, [v2Safes, v2Supply, simulatedDepositAmount, simulatedAmount])

    // Simulated first section (My VELO, veVELO, haiVELO v1): current - simulatedAmount
    const simulatedMyTotalVelo = useMemo(() => {
        const base = Number(myConvertibleVeloTotal || 0)
        const after = Math.max(base - (simulatedAmount > 0 ? simulatedAmount : 0), 0)
        return formatNumberWithStyle(after, { maxDecimals: 2 })
    }, [myConvertibleVeloTotal, simulatedAmount])

    

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
            </Header>
            <Inner $borderOpacity={0.2}>
                {/* Top section - My VELO/veVELO/haiVELO v1 details */}
                <OverviewStat
                    value={formatNumberWithStyle(myConvertibleVeloTotal, { maxDecimals: 2 })}
                    token="VELO"
                    tokenLabel="VELO"
                    label="My VELO, veVELO, haiVELO v1"
                    convertedValue={formatNumberWithStyle(myConvertibleVeloTotal * veloPrice, { style: 'currency' })}
                    simulatedValue={simulatedAmount > 0 ? simulatedMyTotalVelo : undefined}
                    labelOnTop
                />

                {/* My haiVELO section */}
                <OverviewStat
                    value={formatNumberWithStyle(myHaiVeloV2Wallet, { maxDecimals: 2 })}
                    token="HAIVELO"
                    label="My haiVELO v2 In Wallet"
                    convertedValue={formatNumberWithStyle(myHaiVeloV2Wallet * veloPrice, { style: 'currency' })}
                    simulatedValue={simulatedMyHaiVeloV2Wallet}
                    labelOnTop
                />

                {/* Middle section - VELO TVL, Net Rewards APR, Performance Fee */}
                <OverviewStat
                    value={formatNumberWithStyle(myDepositValueUsd, { style: 'currency' })}
                    label="My Deposit"
                    tooltip="Value of your haiVELO v2 deposited across all vaults"
                />
                <OverviewStat
                    value={formatNumberWithStyle(depositTvlUsd, { style: 'currency' })}
                    label="Deposit TVL"
                    tooltip="Total value of all haiVELO v2 deposited as collateral"
                />
                <OverviewStat
                    value={formatNumberWithStyle(underlyingAPR * (hvBoost || 1), {
                        style: 'percent',
                        maxDecimals: 2,
                    })}
                    label="Deposit APR"
                    tooltip="Your boosted APR on haiVELO rewards"
                />
                {/* Removed duplicate panel for Total haiVELO Deposited; represented by progress bar below */}

                {/* Progress bar section with simulation overlay */}
                <OverviewProgressStat
                    value={progressProps.progress?.label || '--%'}
                    label="Total haiVELO Deposited:"
                    progress={progressProps.progress}
                    colorLimits={progressProps.colorLimits}
                    labels={progressProps.labels}
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

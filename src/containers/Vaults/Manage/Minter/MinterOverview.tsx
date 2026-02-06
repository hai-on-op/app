/**
 * MinterOverview
 *
 * Overview component for minter protocols (haiVELO, haiAERO).
 * Displays account stats, TVL, and APR information.
 * Generalized from HaiVeloOverview.
 */

import { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'

import { formatNumberWithStyle, Status } from '~/utils'
import { useMinterProtocol } from '~/providers/MinterProtocolProvider'
import { useBoost } from '~/hooks/useBoost'
import { useUnderlyingAPR } from '~/hooks/useUnderlyingAPR'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useAeroPrice } from '~/hooks/useAeroPrice'
import { fetchV2Totals, fetchV2Safes } from '~/services/minterProtocol/dataSources'

import styled from 'styled-components'
import { type DashedContainerProps, DashedContainerStyle, Flex, Grid, Text, CenteredFlex } from '~/styles'
import { OverviewProgressStat, OverviewStat } from '../OverviewStat'
import { StatusLabel } from '~/components/StatusLabel'
import { Swirl } from '~/components/Icons/Swirl'

export function MinterOverview() {
    const { config, mintingState, accountData } = useMinterProtocol()
    const { simulatedAmount, simulatedDepositAmount } = mintingState

    // Get boost and APR data
    const { hvBoost } = useBoost()
    const { underlyingAPR } = useUnderlyingAPR({ collateralType: config.collateral.v2Id })

    const { address } = useAccount()
    const addrLower = address?.toLowerCase()
    const { prices: veloPrices } = useVelodromePrices()
    const { priceUsd: aeroPriceUsd } = useAeroPrice()

    // Get base token price (VELO or AERO)
    // For haiAero, use the dedicated AERO price hook (DeFiLlama/CoinGecko)
    // since the Velodrome oracle on Optimism doesn't include AERO pricing.
    const baseTokenPrice = useMemo(() => {
        if (config.id === 'haiAero') {
            return aeroPriceUsd || 0
        }
        const priceData = veloPrices?.[config.tokens.baseTokenSymbol]
        return Number(priceData?.raw || 0)
    }, [config.id, aeroPriceUsd, veloPrices, config.tokens.baseTokenSymbol])

    // Fetch V2 safes data
    const { data: v2Safes } = useQuery({
        queryKey: ['minter', config.id, 'v2', 'safes-summary'],
        queryFn: async () => fetchV2Safes(config),
        staleTime: 5 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    })

    // My convertible tokens total (base token + veNFT + v1)
    const myConvertibleTotal = useMemo(() => {
        const baseAmt = Number(accountData.baseTokenBalance.formatted || '0')
        const veNftAmt = Number(accountData.veNft.totalFormatted || '0')
        const v1Amt = config.features.supportsV1Migration ? Number(accountData.v1Balance || '0') : 0
        return baseAmt + veNftAmt + v1Amt
    }, [
        accountData.baseTokenBalance.formatted,
        accountData.veNft.totalFormatted,
        accountData.v1Balance,
        config.features.supportsV1Migration,
    ])

    // My V2 token in wallet (not deposited)
    const myV2Wallet = useMemo(
        () => Number(accountData.v2Balance.formatted || '0'),
        [accountData.v2Balance.formatted]
    )

    const simulatedMyV2Wallet = useMemo(() => {
        if (!(simulatedAmount > 0)) return undefined
        return formatNumberWithStyle(simulatedDepositAmount || 0, { maxDecimals: 2 })
    }, [simulatedDepositAmount, simulatedAmount])

    // My deposit across all vaults (value): v2-only deposits * price
    const myDepositValueUsd = useMemo(() => {
        if (!addrLower || !v2Safes?.safes) return 0
        const qty = v2Safes.safes
            .filter((s) => s.owner?.address?.toLowerCase() === addrLower)
            .reduce((acc, s) => acc + Number(s.collateral || '0'), 0)
        return qty * baseTokenPrice
    }, [v2Safes, addrLower, baseTokenPrice])

    // Deposit TVL (total value deposited as collateral)
    const depositTvlUsd = useMemo(() => {
        const totalQty = Number(v2Safes?.totalCollateral || '0')
        return totalQty * baseTokenPrice
    }, [v2Safes, baseTokenPrice])

    // Fetch V2 supply for progress bar
    const [v2Supply, setV2Supply] = useState<number>(0)
    useEffect(() => {
        let mounted = true
        const run = async () => {
            try {
                const totals = await fetchV2Totals(config)
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
    }, [config])

    // Calculate progress for deposited tokens
    const progressProps = useMemo(() => {
        const totalDepositedQty = Number(v2Safes?.totalCollateral || '0')
        const supplyQty = v2Supply

        const baseProgress = supplyQty > 0 ? Math.min(totalDepositedQty / supplyQty, 1) : 0
        const baseLabel = formatNumberWithStyle(baseProgress * 100, {
            style: 'percent',
            suffixed: true,
            maxDecimals: 2,
        })

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

    // Simulated first section: current - simulatedAmount
    const simulatedMyTotal = useMemo(() => {
        const base = Number(myConvertibleTotal || 0)
        const after = Math.max(base - (simulatedAmount > 0 ? simulatedAmount : 0), 0)
        return formatNumberWithStyle(after, { maxDecimals: 2 })
    }, [myConvertibleTotal, simulatedAmount])

    // Build label for convertible tokens section
    const convertibleLabel = useMemo(() => {
        const parts = [`My ${config.tokens.baseTokenSymbol}`]
        if (config.features.supportsVeNftDeposit) {
            parts.push(`ve${config.tokens.baseTokenSymbol}`)
        }
        if (config.features.supportsV1Migration && config.tokens.wrappedTokenV1Symbol) {
            parts.push(`${config.tokens.wrappedTokenV1Symbol}`)
        }
        return parts.join(', ')
    }, [config])

    return (
        <Container>
            <Header>
                <Flex $justify="flex-start" $align="center" $gap={12}>
                    <Text $fontWeight={700}>{config.displayName} Overview</Text>
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
                    {accountData.isLoading && (
                        <Text $color="rgba(0,0,0,0.5)" $fontSize="0.8em">
                            Loading balances...
                        </Text>
                    )}
                    {accountData.isError && (
                        <Text $color="red" $fontSize="0.8em">
                            Error loading balances
                        </Text>
                    )}
                </Flex>
            </Header>
            <Inner $borderOpacity={0.2}>
                {/* Top section - Convertible tokens */}
                <OverviewStat
                    value={formatNumberWithStyle(myConvertibleTotal, { maxDecimals: 2 })}
                    token={config.tokens.baseTokenSymbol}
                    tokenLabel={config.tokens.baseTokenSymbol}
                    label={convertibleLabel}
                    convertedValue={formatNumberWithStyle(myConvertibleTotal * baseTokenPrice, { style: 'currency' })}
                    simulatedValue={simulatedAmount > 0 ? simulatedMyTotal : undefined}
                    labelOnTop
                />

                {/* My V2 token section */}
                <OverviewStat
                    value={formatNumberWithStyle(myV2Wallet, { maxDecimals: 2 })}
                    token={config.tokens.wrappedTokenV2Symbol}
                    label={`My ${config.displayName} In Wallet`}
                    convertedValue={formatNumberWithStyle(myV2Wallet * baseTokenPrice, { style: 'currency' })}
                    simulatedValue={simulatedMyV2Wallet}
                    labelOnTop
                />

                {/* Middle section - My Deposit, TVL, APR */}
                <OverviewStat
                    value={formatNumberWithStyle(myDepositValueUsd, { style: 'currency' })}
                    label="My Deposit"
                    tooltip={`Value of your ${config.displayName} deposited across all vaults`}
                />
                <OverviewStat
                    value={formatNumberWithStyle(depositTvlUsd, { style: 'currency' })}
                    label="Deposit TVL"
                    tooltip={`Total value of all ${config.displayName} deposited as collateral`}
                />
                <OverviewStat
                    value={formatNumberWithStyle(underlyingAPR * (hvBoost || 1), {
                        style: 'percent',
                        maxDecimals: 2,
                    })}
                    label="Deposit APR"
                    tooltip={`Your boosted APR on ${config.displayName} rewards`}
                />

                {/* Progress bar section */}
                <OverviewProgressStat
                    value={progressProps.progress?.label || '--%'}
                    label={`Total ${config.displayName} Deposited:`}
                    progress={progressProps.progress}
                    colorLimits={progressProps.colorLimits}
                    labels={progressProps.labels}
                    fullWidth
                />
            </Inner>
        </Container>
    )
}

// ============================================================================
// Styled Components
// ============================================================================

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
        /* Top section - Combined tokens (left half) */
        &:nth-child(1) {
            grid-column: 1 / 4;
        }
        /* V2 token section (right half) */
        &:nth-child(2) {
            grid-column: 4 / 7;
        }
        /* Middle section - 2 columns each */
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

export default MinterOverview


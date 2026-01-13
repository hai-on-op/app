/**
 * BridgeTab
 *
 * Component for bridging haiAERO from Base to Optimism via Hyperlane.
 * This tab is shown on the haiAERO page.
 */

import { useState, useMemo, useEffect } from 'react'
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi'
import { ethers } from 'ethers'
import styled from 'styled-components'
import { ArrowRight, AlertCircle, Clock, CheckCircle, Loader } from 'react-feather'

import { formatNumberWithStyle, Status } from '~/utils'
import { useMinterBridge } from '~/hooks/minter'
import { MinterChainId } from '~/types/minterProtocol'
import type { BridgeTransactionStatus } from '~/types/bridge'

import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { StatusLabel } from '~/components/StatusLabel'
import { NumberInput } from '~/components/NumberInput'

export function BridgeTab() {
    const { address, isConnected } = useAccount()
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()

    const [bridgeAmount, setBridgeAmount] = useState('')

    const {
        config,
        quote,
        approval,
        activeTransaction,
        approve,
        bridge,
        isApproving,
        isBridging,
        sourceBalance,
        destinationBalance,
        isOnSourceChain,
        switchToSourceChain,
    } = useMinterBridge(bridgeAmount) as ReturnType<typeof useMinterBridge> & {
        sourceBalance?: { raw: string; formatted: string; decimals: number }
        destinationBalance?: { raw: string; formatted: string; decimals: number }
        isOnSourceChain: boolean
        switchToSourceChain: () => void
    }

    // Parse amount to wei
    const amountWei = useMemo(() => {
        if (!bridgeAmount) return '0'
        try {
            return ethers.utils.parseEther(bridgeAmount).toString()
        } catch {
            return '0'
        }
    }, [bridgeAmount])

    // Check if amount is valid
    const isValidAmount = useMemo(() => {
        if (!bridgeAmount || bridgeAmount === '0') return false
        const amount = parseFloat(bridgeAmount)
        const balance = parseFloat(sourceBalance?.formatted || '0')
        return amount > 0 && amount <= balance
    }, [bridgeAmount, sourceBalance?.formatted])

    // Check if we need approval
    const needsApproval = approval.needsApproval && isValidAmount

    // Handle max button
    const handleMax = () => {
        if (sourceBalance?.formatted) {
            setBridgeAmount(sourceBalance.formatted)
        }
    }

    // Handle approve
    const handleApprove = async () => {
        if (!amountWei || amountWei === '0') return
        await approve(bridgeAmount)
    }

    // Handle bridge
    const handleBridge = async () => {
        if (!address || !amountWei || amountWei === '0') return
        await bridge({
            amount: amountWei,
            recipient: address,
        })
    }

    // Get status icon
    const getStatusIcon = (status: BridgeTransactionStatus) => {
        switch (status) {
            case 'approving':
            case 'bridging':
            case 'pending_confirmation':
                return <Loader size={16} className="spin" />
            case 'confirmed':
            case 'delivered':
                return <CheckCircle size={16} color="#22c55e" />
            case 'failed':
                return <AlertCircle size={16} color="#ef4444" />
            default:
                return null
        }
    }

    // Get status text
    const getStatusText = (status: BridgeTransactionStatus) => {
        switch (status) {
            case 'approving':
                return 'Approving...'
            case 'approved':
                return 'Approved'
            case 'bridging':
                return 'Initiating bridge...'
            case 'pending_confirmation':
                return 'Bridge in progress...'
            case 'confirmed':
                return 'Confirmed on Base'
            case 'delivered':
                return 'Delivered to Optimism!'
            case 'failed':
                return 'Bridge failed'
            default:
                return ''
        }
    }

    return (
        <Container>
            <Header>
                <Flex $width="100%" $justify="space-between" $align="center">
                    <Text $fontWeight={700}>Bridge haiAERO</Text>
                    <ChainBadge>
                        <Text $fontSize="0.75em">Base → Optimism</Text>
                    </ChainBadge>
                </Flex>
            </Header>
            <Body>
                {/* Network Check */}
                {isConnected && !isOnSourceChain && (
                    <NetworkWarning status={Status.CUSTOM} background="gradientCooler">
                        <Flex $align="center" $gap={8}>
                            <AlertCircle size={18} />
                            <Text $fontSize="0.85em">
                                Please switch to Base network to bridge haiAERO
                            </Text>
                        </Flex>
                        <HaiButton
                            $variant="yellowish"
                            $padding="8px 16px"
                            onClick={() => switchNetwork?.(MinterChainId.BASE)}
                        >
                            Switch to Base
                        </HaiButton>
                    </NetworkWarning>
                )}

                {/* Balance Display */}
                <BalanceRow>
                    <BalanceCard>
                        <Text $fontSize="0.75em" $color="rgba(0,0,0,0.6)">
                            haiAERO on Base
                        </Text>
                        <Text $fontWeight={700} $fontSize="1.25em">
                            {formatNumberWithStyle(parseFloat(sourceBalance?.formatted || '0'), {
                                maxDecimals: 4,
                            })}
                        </Text>
                    </BalanceCard>
                    <ArrowRight size={24} color="rgba(0,0,0,0.3)" />
                    <BalanceCard>
                        <Text $fontSize="0.75em" $color="rgba(0,0,0,0.6)">
                            haiAERO on Optimism
                        </Text>
                        <Text $fontWeight={700} $fontSize="1.25em">
                            {formatNumberWithStyle(parseFloat(destinationBalance?.formatted || '0'), {
                                maxDecimals: 4,
                            })}
                        </Text>
                    </BalanceCard>
                </BalanceRow>

                {/* Bridge Amount Input */}
                <NumberInput
                    label="Amount to Bridge"
                    subLabel={`Available: ${formatNumberWithStyle(
                        parseFloat(sourceBalance?.formatted || '0'),
                        { maxDecimals: 4 }
                    )} haiAERO`}
                    placeholder="0.0"
                    unitLabel="haiAERO"
                    min="0"
                    max={sourceBalance?.formatted || '0'}
                    value={bridgeAmount}
                    onChange={(value: string) => {
                        const maxNum = parseFloat(sourceBalance?.formatted || '0')
                        const inputNum = parseFloat(value || '0')
                        if (inputNum > maxNum) {
                            setBridgeAmount(sourceBalance?.formatted || '0')
                        } else {
                            setBridgeAmount(value)
                        }
                    }}
                    onMax={handleMax}
                    disabled={!isOnSourceChain}
                />

                {/* Fee Display */}
                {isValidAmount && (
                    <FeeContainer>
                        <Flex $justify="space-between" $width="100%">
                            <Text $fontSize="0.85em" $color="rgba(0,0,0,0.6)">
                                Bridge Fee
                            </Text>
                            <Text $fontSize="0.85em" $fontWeight={600}>
                                {quote.isLoading ? (
                                    'Loading...'
                                ) : quote.error ? (
                                    <Text $color="#ef4444">Error</Text>
                                ) : (
                                    `~${formatNumberWithStyle(parseFloat(quote.feeFormatted), {
                                        maxDecimals: 6,
                                    })} ETH`
                                )}
                            </Text>
                        </Flex>
                        <Flex $justify="space-between" $width="100%" $align="center">
                            <Flex $align="center" $gap={4}>
                                <Clock size={14} color="rgba(0,0,0,0.5)" />
                                <Text $fontSize="0.85em" $color="rgba(0,0,0,0.6)">
                                    Estimated Time
                                </Text>
                            </Flex>
                            <Text $fontSize="0.85em" $fontWeight={600}>
                                ~{config.estimatedBridgeTimeMinutes} minutes
                            </Text>
                        </Flex>
                    </FeeContainer>
                )}

                {/* Active Transaction Status */}
                {activeTransaction && (
                    <StatusContainer>
                        <Flex $align="center" $gap={8}>
                            {getStatusIcon(activeTransaction.status)}
                            <Text $fontWeight={600}>{getStatusText(activeTransaction.status)}</Text>
                        </Flex>
                        {activeTransaction.sourceTxHash && (
                            <Text $fontSize="0.8em" $color="rgba(0,0,0,0.6)">
                                Tx: {activeTransaction.sourceTxHash.slice(0, 10)}...
                                {activeTransaction.sourceTxHash.slice(-8)}
                            </Text>
                        )}
                        {activeTransaction.status === 'pending_confirmation' && (
                            <Text $fontSize="0.8em" $color="rgba(0,0,0,0.6)">
                                Your haiAERO will arrive on Optimism in ~
                                {config.estimatedBridgeTimeMinutes} minutes
                            </Text>
                        )}
                    </StatusContainer>
                )}

                {/* Bridge Info */}
                <InfoBox status={Status.CUSTOM} background="gradientCooler">
                    <Text $fontSize="0.85em">
                        ℹ️ Bridging haiAERO from Base to Optimism via Hyperlane allows you to use
                        haiAERO as collateral in HAI vaults on Optimism.
                    </Text>
                </InfoBox>
            </Body>
            <Footer>
                {!isConnected ? (
                    <HaiButton $variant="yellowish" $width="100%" $justify="center" disabled>
                        Connect Wallet
                    </HaiButton>
                ) : !isOnSourceChain ? (
                    <HaiButton
                        $variant="yellowish"
                        $width="100%"
                        $justify="center"
                        onClick={() => switchNetwork?.(MinterChainId.BASE)}
                    >
                        Switch to Base
                    </HaiButton>
                ) : needsApproval ? (
                    <HaiButton
                        $variant="yellowish"
                        $width="100%"
                        $justify="center"
                        onClick={handleApprove}
                        disabled={isApproving || !isValidAmount}
                    >
                        {isApproving ? (
                            <>
                                <Loader size={16} className="spin" />
                                Approving...
                            </>
                        ) : (
                            'Approve haiAERO'
                        )}
                    </HaiButton>
                ) : (
                    <HaiButton
                        $variant="yellowish"
                        $width="100%"
                        $justify="center"
                        onClick={handleBridge}
                        disabled={isBridging || !isValidAmount || quote.isLoading}
                    >
                        {isBridging ? (
                            <>
                                <Loader size={16} className="spin" />
                                Bridging...
                            </>
                        ) : (
                            'Bridge to Optimism'
                        )}
                    </HaiButton>
                )}
            </Footer>
        </Container>
    )
}

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Flex).attrs((props) => ({
    $column: true,
    $shrink: 0,
    ...props,
}))`
    max-width: 100%;
    height: 592px;
    margin-bottom: -143px;
    background-color: #f7f1ff;
    border-radius: 24px;
    border: ${({ theme }) => theme.border.medium};

    ${({ theme }) => theme.mediaWidth.upToMedium`
        height: auto;
        min-height: 480px;
        margin-bottom: -119px;
    `}

    .spin {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
`

const Header = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-end',
    $align: 'flex-start',
    $gap: 12,
    ...props,
}))`
    padding-top: 24px;
    padding-bottom: 20px;
    border-bottom: ${({ theme }) => theme.border.thin};

    & > *:first-child {
        padding: 0 24px;
    }
`

const Body = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 24,
    $grow: 1,
    $shrink: 1,
    ...props,
}))`
    height: 100%;
    padding: 24px;
    overflow: auto;
`

const Footer = styled(CenteredFlex).attrs((props) => ({
    $column: true,
    $gap: 12,
    ...props,
}))`
    width: 100%;
    padding: 24px;
    border-top: ${({ theme }) => theme.border.thin};
`

const ChainBadge = styled(Flex)`
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    padding: 4px 12px;
    border-radius: 12px;
    color: white;
`

const NetworkWarning = styled(StatusLabel)`
    border-radius: 12px;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
    width: 100%;
`

const BalanceRow = styled(Flex)`
    width: 100%;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
`

const BalanceCard = styled(Flex).attrs((props) => ({
    $column: true,
    $gap: 4,
    ...props,
}))`
    flex: 1;
    background: rgba(255, 255, 255, 0.5);
    padding: 16px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
`

const FeeContainer = styled(Flex).attrs((props) => ({
    $column: true,
    $gap: 8,
    ...props,
}))`
    width: 100%;
    padding: 16px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
`

const StatusContainer = styled(Flex).attrs((props) => ({
    $column: true,
    $gap: 8,
    $align: 'center',
    ...props,
}))`
    width: 100%;
    padding: 16px;
    background: rgba(34, 197, 94, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(34, 197, 94, 0.3);
`

const InfoBox = styled(StatusLabel)`
    border-radius: 12px;
`

export default BridgeTab


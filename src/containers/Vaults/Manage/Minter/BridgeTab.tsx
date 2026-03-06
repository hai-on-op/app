/**
 * BridgeTab
 *
 * Component for bridging haiAERO between Base and Optimism via Hyperlane.
 * Supports both directions: Base → Optimism and Optimism → Base.
 */

import { useState, useMemo, useEffect } from 'react'
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi'
import { ethers } from 'ethers'
import styled from 'styled-components'
import { AlertCircle, Clock, CheckCircle, Loader } from 'react-feather'
import { HaiArrow } from '~/components/Icons/HaiArrow'

import { formatNumberWithStyle, Status } from '~/utils'
import { useMinterBridge } from '~/hooks/minter'
import { MinterChainId } from '~/types/minterProtocol'
import type { BridgeTransactionStatus, BridgeDirection } from '~/types/bridge'

import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { StatusLabel } from '~/components/StatusLabel'
import { NumberInput } from '~/components/NumberInput'

const BRIDGE_DIRECTION_STORAGE_KEY = 'hai-bridge-direction'

function getStoredDirection(): BridgeDirection {
    try {
        const stored = localStorage.getItem(BRIDGE_DIRECTION_STORAGE_KEY)
        if (stored === 'base-to-optimism' || stored === 'optimism-to-base') {
            return stored
        }
    } catch {
        // localStorage might not be available
    }
    return 'base-to-optimism'
}

function storeDirection(direction: BridgeDirection) {
    try {
        localStorage.setItem(BRIDGE_DIRECTION_STORAGE_KEY, direction)
    } catch {
        // localStorage might not be available
    }
}

export function BridgeTab() {
    const { address, isConnected } = useAccount()
    const { chain: _chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()

    const [bridgeAmount, setBridgeAmount] = useState('')
    const [direction, setDirectionState] = useState<BridgeDirection>(getStoredDirection)

    // Wrapper to persist direction changes
    const setDirection = (newDirection: BridgeDirection | ((prev: BridgeDirection) => BridgeDirection)) => {
        setDirectionState((prev) => {
            const next = typeof newDirection === 'function' ? newDirection(prev) : newDirection
            storeDirection(next)
            return next
        })
    }

    const {
        config,
        quote,
        approval,
        activeTransaction,
        validationError,
        isValidating,
        approve,
        bridge,
        isApproving,
        isBridging,
        baseBalance,
        optimismBalance,
        sourceBalance,
        destinationBalance: _destinationBalance,
        isOnSourceChain,
        switchToSourceChain: _switchToSourceChain,
        isWaitingForDelivery,
    } = useMinterBridge(bridgeAmount, direction)

    // Direction-aware labels
    const sourceChainName = direction === 'base-to-optimism' ? 'Base' : 'Optimism'
    const destChainName = direction === 'base-to-optimism' ? 'Optimism' : 'Base'
    const requiredChainId = direction === 'base-to-optimism' ? MinterChainId.BASE : MinterChainId.OPTIMISM

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

    // Clear input after successful bridge delivery
    useEffect(() => {
        if (activeTransaction?.status === 'delivered') {
            setBridgeAmount('')
        }
    }, [activeTransaction?.status])

    // Clear input when direction changes
    useEffect(() => {
        setBridgeAmount('')
    }, [direction])

    // Toggle direction
    const toggleDirection = () => {
        setDirection((prev) => (prev === 'base-to-optimism' ? 'optimism-to-base' : 'base-to-optimism'))
    }

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
                return `Confirmed on ${sourceChainName}`
            case 'delivered':
                return `Delivered to ${destChainName}!`
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
                    <Text $fontSize="0.75em" $color="rgba(0,0,0,0.6)">
                        {sourceChainName} → {destChainName}
                    </Text>
                </Flex>
            </Header>
            <Body>
                {/* Network Check */}
                {isConnected && !isOnSourceChain && (
                    <NetworkWarning status={Status.CUSTOM} background="gradientCooler">
                        <Flex $align="center" $gap={8}>
                            <AlertCircle size={18} />
                            <Text $fontSize="0.85em">Please switch to {sourceChainName} network to bridge haiAERO</Text>
                        </Flex>
                        <HaiButton
                            $variant="yellowish"
                            $padding="8px 16px"
                            onClick={() => switchNetwork?.(requiredChainId)}
                        >
                            Switch to {sourceChainName}
                        </HaiButton>
                    </NetworkWarning>
                )}

                {/* Balance Display */}
                <BalanceRow>
                    <BalanceCard $isSource={direction === 'base-to-optimism'}>
                        <Text $fontSize="0.75em" $color="rgba(0,0,0,0.6)">
                            haiAERO on Base
                        </Text>
                        <Text $fontWeight={700} $fontSize="1.25em">
                            {formatNumberWithStyle(parseFloat(baseBalance?.formatted || '0'), {
                                maxDecimals: 4,
                            })}
                        </Text>
                        {direction === 'base-to-optimism' && <SourceBadge>Source</SourceBadge>}
                    </BalanceCard>
                    <DirectionArrowButton
                        onClick={toggleDirection}
                        disabled={isBridging || isWaitingForDelivery}
                        $reverse={direction === 'optimism-to-base'}
                        title="Switch direction"
                    >
                        <HaiArrow size={20} direction={direction === 'base-to-optimism' ? 'right' : 'left'} />
                    </DirectionArrowButton>
                    <BalanceCard $isSource={direction === 'optimism-to-base'}>
                        <Text $fontSize="0.75em" $color="rgba(0,0,0,0.6)">
                            haiAERO on Optimism
                        </Text>
                        <Text $fontWeight={700} $fontSize="1.25em">
                            {formatNumberWithStyle(parseFloat(optimismBalance?.formatted || '0'), {
                                maxDecimals: 4,
                            })}
                        </Text>
                        {direction === 'optimism-to-base' && <SourceBadge>Source</SourceBadge>}
                    </BalanceCard>
                </BalanceRow>

                {/* Bridge Amount Input */}
                <NumberInput
                    label="Amount to Bridge"
                    subLabel={`Available: ${formatNumberWithStyle(parseFloat(sourceBalance?.formatted || '0'), {
                        maxDecimals: 4,
                    })} haiAERO`}
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
                                ~{config.estimatedBridgeTimeSeconds} seconds
                            </Text>
                        </Flex>
                    </FeeContainer>
                )}

                {isValidAmount && isValidating && !validationError && (
                    <ValidationNotice status={Status.NEUTRAL} background="white">
                        <Flex $align="center" $gap={8}>
                            <Loader size={14} className="spin" />
                            <Text $fontSize="0.85em">Validating bridge prerequisites...</Text>
                        </Flex>
                    </ValidationNotice>
                )}

                {validationError && (
                    <ValidationNotice status={Status.NEGATIVE} background="white">
                        <Flex $align="center" $gap={8}>
                            <AlertCircle size={16} color="#ef4444" />
                            <Text $fontSize="0.85em">{validationError}</Text>
                        </Flex>
                    </ValidationNotice>
                )}

                {/* Active Transaction Status */}
                {activeTransaction && (
                    <StatusContainer $delivered={activeTransaction.status === 'delivered'}>
                        <Flex $align="center" $gap={8}>
                            {getStatusIcon(activeTransaction.status)}
                            <Text $fontWeight={600}>{getStatusText(activeTransaction.status)}</Text>
                        </Flex>
                        {activeTransaction.sourceTxHash && (
                            <ExplorerLink
                                href={
                                    activeTransaction.messageId
                                        ? `https://explorer.hyperlane.xyz/message/${activeTransaction.messageId}`
                                        : `https://explorer.hyperlane.xyz/?search=${activeTransaction.sourceTxHash}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Tx: {activeTransaction.sourceTxHash}
                            </ExplorerLink>
                        )}
                        {(activeTransaction.status === 'pending_confirmation' ||
                            activeTransaction.status === 'confirmed') &&
                            isWaitingForDelivery && (
                                <Flex $column $gap={4} $align="center">
                                    <Text $fontSize="0.8em" $color="rgba(0,0,0,0.6)">
                                        Waiting for tokens to arrive on {destChainName}...
                                    </Text>
                                    <Text $fontSize="0.75em" $color="rgba(0,0,0,0.5)">
                                        (polling every 5 seconds)
                                    </Text>
                                </Flex>
                            )}
                        {activeTransaction.status === 'delivered' && (
                            <Text $fontSize="0.85em" $color="#16a34a" $fontWeight={600}>
                                🎉 Bridge complete! Tokens arrived on {destChainName}.
                            </Text>
                        )}
                    </StatusContainer>
                )}

                {/* Bridge Info */}
                <InfoBox status={Status.CUSTOM} background="gradientCooler">
                    <Text $fontSize="0.85em">
                        {direction === 'base-to-optimism' ? (
                            <>
                                ℹ️ Bridging haiAERO from Base to Optimism via Hyperlane allows you to use haiAERO as
                                collateral in HAI vaults on Optimism.
                            </>
                        ) : (
                            <>
                                ℹ️ Bridging haiAERO from Optimism back to Base allows you to redeem your haiAERO for
                                AERO or use it in other Base protocols.
                            </>
                        )}
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
                        onClick={() => switchNetwork?.(requiredChainId)}
                    >
                        Switch to {sourceChainName}
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
                        disabled={
                            isBridging || !isValidAmount || quote.isLoading || isValidating || Boolean(validationError)
                        }
                    >
                        {isBridging ? (
                            <>
                                <Loader size={16} className="spin" />
                                Bridging...
                            </>
                        ) : (
                            `Bridge to ${destChainName}`
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
}))<{ $isSource?: boolean }>`
    flex: 1;
    position: relative;
    background: ${({ $isSource }) => ($isSource ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.5)')};
    padding: 16px;
    border-radius: 12px;
    border: 1px solid ${({ $isSource }) => ($isSource ? 'rgba(59, 130, 246, 0.3)' : 'rgba(0, 0, 0, 0.1)')};
    transition:
        background 0.2s,
        border-color 0.2s;
`

const SourceBadge = styled.span`
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 0.65em;
    background: #3b82f6;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
`

const DirectionArrowButton = styled.button<{ $reverse?: boolean; disabled?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    background: ${({ theme }) => theme.colors.gradientCool};
    border: ${({ theme }) => theme.border.medium};
    border-radius: 999px;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
    transition: all 0.3s ease;

    &:hover:not(:disabled) {
        background: ${({ theme }) => theme.colors.yellowish};
    }

    &:active:not(:disabled) {
        transform: scale(0.95);
    }
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

const ValidationNotice = styled(StatusLabel)`
    width: 100%;
    border-radius: 12px;
`

const StatusContainer = styled(Flex).attrs((props) => ({
    $column: true,
    $gap: 8,
    $align: 'center',
    ...props,
}))<{ $delivered?: boolean }>`
    width: 100%;
    padding: 16px;
    background: ${({ $delivered }) => ($delivered ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.1)')};
    border-radius: 12px;
    border: 1px solid ${({ $delivered }) => ($delivered ? 'rgba(34, 197, 94, 0.5)' : 'rgba(59, 130, 246, 0.3)')};
`

const ExplorerLink = styled.a`
    font-size: 0.8em;
    color: rgba(0, 0, 0, 0.6);
    word-break: break-all;
    text-decoration: underline;

    &:hover {
        color: rgba(0, 0, 0, 0.8);
    }
`

const InfoBox = styled(StatusLabel)`
    border-radius: 12px;
`

export default BridgeTab

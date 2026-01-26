/**
 * MinterMultiStepModal - BridgeExecute Step
 *
 * Handles the bridge execution step for haiAERO.
 * Bridges tokens from Base to Optimism via Hyperlane.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ethers, BigNumber } from 'ethers'
import { useAccount, useWalletClient } from 'wagmi'

import { ActionState, formatNumberWithStyle } from '~/utils'
import { useStoreActions } from '~/store'
import type { MinterProtocolConfig } from '~/types/minterProtocol'
import {
    getBridgeConfig,
    quoteBridgeFee,
    checkBridgeApproval,
    approveBridge,
    executeBridge,
    getOptimismBalance,
} from '~/services/hyperlane'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { ModalBody, ModalFooter } from '../index'
import { ArrowRight, CheckCircle, Clock, AlertCircle } from 'react-feather'
import { Loader } from '~/components/Loader'

type Props = {
    config: MinterProtocolConfig
    amountToBridge: string
    onDone: () => void
}

type BridgePhase = 'idle' | 'checking' | 'approving' | 'bridging' | 'pending' | 'delivered' | 'failed'

/**
 * Convert wagmi wallet client to ethers signer
 */
function walletClientToSigner(
    walletClient: ReturnType<typeof useWalletClient>['data']
): ethers.Signer | undefined {
    if (!walletClient) return undefined

    const { account, chain, transport } = walletClient
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    }
    const provider = new ethers.providers.Web3Provider(transport, network)
    return provider.getSigner(account.address)
}

export function BridgeExecute({ config, amountToBridge, onDone }: Props) {
    const { address } = useAccount()
    const { data: walletClient } = useWalletClient()
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const [phase, setPhase] = useState<BridgePhase>('idle')
    const [txHash, setTxHash] = useState<string>('')
    const [error, setError] = useState<string>('')
    const [fee, setFee] = useState<string>('0')
    const [needsApproval, setNeedsApproval] = useState(true)
    const hasClosedRef = useRef(false)
    const preBridgeBalanceRef = useRef<string | null>(null)

    const bridgeConfig = getBridgeConfig()

    // Format amount for display
    const formattedAmount = useMemo(() => {
        try {
            const amountNum = parseFloat(ethers.utils.formatEther(amountToBridge))
            return formatNumberWithStyle(amountNum, { maxDecimals: 4 })
        } catch {
            return '0'
        }
    }, [amountToBridge])

    useEffect(() => {
        return () => {
            hasClosedRef.current = true
        }
    }, [])

    // Check approval and quote fee on mount
    useEffect(() => {
        const check = async () => {
            if (!address) return
            setPhase('checking')

            try {
                const [approvalState, feeQuote] = await Promise.all([
                    checkBridgeApproval(address, amountToBridge),
                    quoteBridgeFee(amountToBridge),
                ])

                if (hasClosedRef.current) return

                setNeedsApproval(approvalState.needsApproval)
                setFee(feeQuote.feeFormatted)
                setPhase('idle')
            } catch (e) {
                console.error('Error checking bridge state:', e)
                if (hasClosedRef.current) return
                setPhase('idle')
            }
        }

        check()
    }, [address, amountToBridge])

    // Handle approve
    const handleApprove = useCallback(async () => {
        if (!walletClient || !address) return

        const signer = walletClientToSigner(walletClient)
        if (!signer) return

        setPhase('approving')
        setError('')

        try {
            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                title: 'Waiting for confirmation',
                text: 'Approve haiAERO for bridging',
                status: ActionState.LOADING,
            })

            const result = await approveBridge(signer, amountToBridge)
            await result.wait()

            if (hasClosedRef.current) return

            setNeedsApproval(false)
            setPhase('idle')
        } catch (e) {
            console.error('Approval failed:', e)
            if (hasClosedRef.current) return
            setError(e instanceof Error ? e.message : 'Approval failed')
            setPhase('failed')
        } finally {
            popupsActions.setIsWaitingModalOpen(false)
            popupsActions.setWaitingPayload({ status: ActionState.NONE })
        }
    }, [walletClient, address, amountToBridge, popupsActions])

    // Handle bridge
    const handleBridge = useCallback(async () => {
        if (!walletClient || !address) return

        const signer = walletClientToSigner(walletClient)
        if (!signer) return

        setPhase('bridging')
        setError('')

        try {
            // Capture pre-bridge balance on Optimism for delivery detection
            const preBridgeBalance = await getOptimismBalance(address)
            preBridgeBalanceRef.current = preBridgeBalance.raw
            console.log('[BridgeExecute] Pre-bridge Optimism balance:', preBridgeBalance.raw)

            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                title: 'Waiting for confirmation',
                text: 'Confirm bridge transaction',
                status: ActionState.LOADING,
            })

            const result = await executeBridge(signer, amountToBridge, address)
            setTxHash(result.txHash)

            popupsActions.setWaitingPayload({
                title: 'Bridge Initiated',
                text: 'Waiting for confirmation...',
                status: ActionState.LOADING,
            })

            await result.wait()

            if (hasClosedRef.current) return

            setPhase('pending')
        } catch (e) {
            console.error('Bridge failed:', e)
            if (hasClosedRef.current) return
            setError(e instanceof Error ? e.message : 'Bridge failed')
            setPhase('failed')
            preBridgeBalanceRef.current = null
        } finally {
            popupsActions.setIsWaitingModalOpen(false)
            popupsActions.setWaitingPayload({ status: ActionState.NONE })
        }
    }, [walletClient, address, amountToBridge, popupsActions])

    // Poll for delivery by checking destination balance
    useEffect(() => {
        if (phase !== 'pending' || !address || !preBridgeBalanceRef.current) return

        const pollDelivery = async () => {
            try {
                const currentBalance = await getOptimismBalance(address)
                if (hasClosedRef.current) return

                const currentBN = BigNumber.from(currentBalance.raw)
                const preBridgeBN = BigNumber.from(preBridgeBalanceRef.current || '0')

                console.log('[BridgeExecute] Polling - Pre-bridge:', preBridgeBalanceRef.current, 'Current:', currentBalance.raw)

                if (currentBN.gt(preBridgeBN)) {
                    // Balance increased - tokens have arrived!
                    console.log('[BridgeExecute] Delivery detected! Balance increased.')
                    setPhase('delivered')
                    preBridgeBalanceRef.current = null
                }
            } catch (e) {
                console.error('Error checking delivery status:', e)
            }
        }

        // Poll every 5 seconds
        const interval = setInterval(pollDelivery, 5000)
        // Also check immediately
        pollDelivery()

        // Timeout after 10 minutes
        const timeout = setTimeout(() => {
            console.log('[BridgeExecute] Delivery polling timeout')
            clearInterval(interval)
        }, 10 * 60 * 1000)

        return () => {
            clearInterval(interval)
            clearTimeout(timeout)
        }
    }, [phase, address])

    const getStatusDisplay = () => {
        switch (phase) {
            case 'checking':
                return (
                    <StatusRow>
                        <Loader size={20} />
                        <Text>Checking approval status...</Text>
                    </StatusRow>
                )
            case 'approving':
                return (
                    <StatusRow>
                        <Loader size={20} />
                        <Text>Approving haiAERO...</Text>
                    </StatusRow>
                )
            case 'bridging':
                return (
                    <StatusRow>
                        <Loader size={20} />
                        <Text>Initiating bridge...</Text>
                    </StatusRow>
                )
            case 'pending':
                return (
                    <StatusRow $variant="info">
                        <Clock size={20} />
                        <Flex $column $gap={4}>
                            <Text $fontWeight={600}>Bridge in progress</Text>
                            <Text $fontSize="0.85em" $color="rgba(0,0,0,0.6)">
                                Waiting for tokens to arrive on Optimism...
                            </Text>
                            <Text $fontSize="0.75em" $color="rgba(0,0,0,0.5)">
                                (checking every 5 seconds)
                            </Text>
                            {txHash && (
                                <Text $fontSize="0.8em" $color="rgba(0,0,0,0.5)">
                                    Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                                </Text>
                            )}
                        </Flex>
                    </StatusRow>
                )
            case 'delivered':
                return (
                    <StatusRow $variant="success">
                        <CheckCircle size={20} color="#22c55e" />
                        <Flex $column $gap={4}>
                            <Text $fontWeight={600} $color="#22c55e">
                                Bridge Complete!
                            </Text>
                            <Text $fontSize="0.85em">
                                Your haiAERO has been delivered to Optimism. You can now use it as collateral in HAI
                                vaults.
                            </Text>
                        </Flex>
                    </StatusRow>
                )
            case 'failed':
                return (
                    <StatusRow $variant="error">
                        <AlertCircle size={20} color="#ef4444" />
                        <Flex $column $gap={4}>
                            <Text $fontWeight={600} $color="#ef4444">
                                Bridge Failed
                            </Text>
                            {error && (
                                <Text $fontSize="0.85em" $color="rgba(0,0,0,0.6)">
                                    {error}
                                </Text>
                            )}
                        </Flex>
                    </StatusRow>
                )
            default:
                return null
        }
    }

    const getButtonContent = () => {
        if (phase === 'checking') {
            return { label: 'Checking...', disabled: true, onClick: () => {} }
        }
        if (phase === 'approving') {
            return { label: 'Approving...', disabled: true, onClick: () => {} }
        }
        if (phase === 'bridging') {
            return { label: 'Bridging...', disabled: true, onClick: () => {} }
        }
        if (phase === 'pending') {
            return { label: 'Waiting for delivery...', disabled: true, onClick: () => {} }
        }
        if (phase === 'delivered') {
            return { label: 'Done', disabled: false, onClick: onDone }
        }
        if (phase === 'failed') {
            return { label: 'Retry', disabled: false, onClick: () => setPhase('idle') }
        }
        if (needsApproval) {
            return { label: 'Approve haiAERO', disabled: false, onClick: handleApprove }
        }
        return { label: 'Bridge to Optimism', disabled: false, onClick: handleBridge }
    }

    const buttonContent = getButtonContent()

    return (
        <>
            <ModalBody>
                <Flex $width="100%" $column $gap={16} $align="flex-start" $justify="flex-start">
                    <Description>
                        Bridge your newly minted haiAERO from Base to Optimism to use as vault collateral.
                    </Description>

                    {/* Amount display */}
                    <AmountCard>
                        <Flex $justify="space-between" $width="100%" $align="center">
                            <Flex $column $gap={4}>
                                <Text $fontSize="0.8em" $color="rgba(0,0,0,0.6)">
                                    Amount to Bridge
                                </Text>
                                <Text $fontWeight={700} $fontSize="1.5em">
                                    {formattedAmount} haiAERO
                                </Text>
                            </Flex>
                            <ArrowRight size={24} color="rgba(0,0,0,0.3)" />
                            <Flex $column $gap={4} $align="flex-end">
                                <Text $fontSize="0.8em" $color="rgba(0,0,0,0.6)">
                                    Destination
                                </Text>
                                <ChainBadge>Optimism</ChainBadge>
                            </Flex>
                        </Flex>
                    </AmountCard>

                    {/* Fee display */}
                    {phase === 'idle' && !needsApproval && (
                        <FeeRow>
                            <Text $fontSize="0.85em" $color="rgba(0,0,0,0.6)">
                                Estimated Bridge Fee
                            </Text>
                            <Text $fontSize="0.85em" $fontWeight={600}>
                                ~{formatNumberWithStyle(parseFloat(fee), { maxDecimals: 6 })} ETH
                            </Text>
                        </FeeRow>
                    )}

                    {/* Status display */}
                    {getStatusDisplay()}
                </Flex>
            </ModalBody>
            <ModalFooter $gap={24} $justify="flex-end">
                <HaiButton $variant="yellowish" disabled={buttonContent.disabled} onClick={buttonContent.onClick}>
                    {buttonContent.label}
                </HaiButton>
            </ModalFooter>
        </>
    )
}

const Description = styled(Text)`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        font-size: ${theme.font.small};
    `}
`

const AmountCard = styled(Flex).attrs((props) => ({
    $width: '100%',
    ...props,
}))`
    background: rgba(255, 255, 255, 0.5);
    padding: 20px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
`

const ChainBadge = styled(Flex)`
    background: linear-gradient(90deg, #ff0420, #ff4d4d);
    padding: 6px 12px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    font-size: 0.9em;
`

const FeeRow = styled(Flex)`
    width: 100%;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 8px;
`

const StatusRow = styled(Flex)<{ $variant?: 'info' | 'success' | 'error' }>`
    width: 100%;
    gap: 12px;
    align-items: flex-start;
    padding: 16px;
    border-radius: 12px;
    background: ${({ $variant }) =>
        $variant === 'success'
            ? 'rgba(34, 197, 94, 0.1)'
            : $variant === 'error'
              ? 'rgba(239, 68, 68, 0.1)'
              : $variant === 'info'
                ? 'rgba(59, 130, 246, 0.1)'
                : 'transparent'};
    border: 1px solid
        ${({ $variant }) =>
            $variant === 'success'
                ? 'rgba(34, 197, 94, 0.3)'
                : $variant === 'error'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : $variant === 'info'
                    ? 'rgba(59, 130, 246, 0.3)'
                    : 'transparent'};
`


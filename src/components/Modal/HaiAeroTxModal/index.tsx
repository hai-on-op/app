/**
 * HaiAeroTxModal
 *
 * Unified multi-step transaction modal for haiAERO minting flow.
 * Shows all steps (approve, mint, bridge) in a single view with TransactionSummary.
 * Users complete each step sequentially with a single button.
 *
 * Follows the InstantWithdrawExecute pattern from StakingTxModal.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BigNumber, ethers } from 'ethers'
import { useAccount, useWalletClient } from 'wagmi'

import { ActionState, formatNumberWithStyle } from '~/utils'
import { useStoreActions } from '~/store'
import { useContract } from '~/hooks/useContract'
import { useTokenAllowance } from '~/hooks/useTokenApproval'
import { useMinterProtocol } from '~/providers/MinterProtocolProvider'
import { useVault } from '~/providers/VaultProvider'
import type { MinterProtocolConfig } from '~/types/minterProtocol'
import {
    quoteBridgeFee,
    checkBridgeApproval,
    approveBridge,
    executeBridge,
    getOptimismBalance,
} from '~/services/hyperlane'

import HAI_VELO_V2_ABI from '~/abis/haiVELO_v2.json'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { Modal, ModalBody, ModalFooter, type ModalProps } from '../index'
import { BrandedTitle } from '~/components/BrandedTitle'
import { X } from '~/components/Icons/X'
import { ArrowRightCircle, Check, Clock } from 'react-feather'
import { Loader } from '~/components/Loader'
import { TransactionSummary } from '~/components/TransactionSummary'

type StepKey = 'approve' | 'mint' | 'veNftApprove' | 'mintVeNft' | 'bridgeApprove' | 'bridge' | 'delivery'

type Step = {
    key: StepKey
    label: string
    run: () => Promise<void>
}

type ExecutionPlan = {
    depositBaseWei?: string
    depositVeNftTokenIds?: string[]
    depositVeNftTotalWei?: string
}

type HaiAeroTxModalProps = ModalProps & {
    config: MinterProtocolConfig
    plan: ExecutionPlan
    onSuccess?: () => void
}

/**
 * Convert wagmi wallet client to ethers signer
 */
function walletClientToSigner(walletClient: ReturnType<typeof useWalletClient>['data']): ethers.Signer | undefined {
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

export function HaiAeroTxModal({ config, plan, onSuccess, ...props }: HaiAeroTxModalProps) {
    const { address } = useAccount()
    const { data: walletClient } = useWalletClient()
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)
    const { accountData, refetchAccount } = useMinterProtocol()
    const { refreshVault } = useVault()

    const CONTRACT_ADDRESS = config.tokens.wrappedTokenV2Address
    const mintContract = useContract(CONTRACT_ADDRESS, HAI_VELO_V2_ABI as unknown as ethers.ContractInterface)

    // State
    const [currentIndex, setCurrentIndex] = useState(0)
    const [pending, setPending] = useState(false)
    const [done, setDone] = useState<Record<StepKey, boolean>>({
        approve: false,
        mint: false,
        veNftApprove: false,
        mintVeNft: false,
        bridgeApprove: false,
        bridge: false,
        delivery: false,
    })
    const [isComplete, setIsComplete] = useState(false)
    const [bridgeTxHash, setBridgeTxHash] = useState<string>('')
    const [bridgeMessageId, setBridgeMessageId] = useState<string>('')
    const [waitingForDelivery, setWaitingForDelivery] = useState(false)
    const hasClosedRef = useRef(false)
    const preBridgeBalanceRef = useRef<string | null>(null)

    // Snapshot initial balances
    const [initialBalances] = useState({
        base: accountData.baseTokenBalance.formatted,
        veNft: accountData.veNft.totalFormatted,
        v2: accountData.v2Balance.formatted, // Current haiAERO balance
    })

    // Calculate total amount to mint (and bridge)
    const totalMintWei = useMemo(() => {
        let total = BigNumber.from(0)
        if (plan.depositBaseWei) total = total.add(BigNumber.from(plan.depositBaseWei))
        if (plan.depositVeNftTotalWei) total = total.add(BigNumber.from(plan.depositVeNftTotalWei))
        return total
    }, [plan])

    // Check AERO approval for minting
    const { allowance: aeroAllowance, updateAllowance: updateAeroAllowance } = useTokenAllowance(
        config.tokens.baseTokenAddress,
        address ?? undefined,
        CONTRACT_ADDRESS
    )

    // Determine if AERO approval is needed for minting
    const needsAeroApproval = useMemo(() => {
        if (!plan.depositBaseWei || BigNumber.from(plan.depositBaseWei).eq(0)) return false
        if (!aeroAllowance) return true // Unknown state, assume needs approval
        return aeroAllowance.lt(BigNumber.from(plan.depositBaseWei))
    }, [aeroAllowance, plan.depositBaseWei])

    // Capture initial AERO approval state (only set once)
    const [initialNeedsAeroApproval, setInitialNeedsAeroApproval] = useState<boolean | null>(null)
    useEffect(() => {
        if (initialNeedsAeroApproval === null && aeroAllowance !== undefined) {
            setInitialNeedsAeroApproval(needsAeroApproval)
        }
    }, [needsAeroApproval, aeroAllowance, initialNeedsAeroApproval])

    // Check veNFT approval for minting
    const [needsVeNftApproval, setNeedsVeNftApproval] = useState(true)
    const [initialNeedsVeNftApproval, setInitialNeedsVeNftApproval] = useState<boolean | null>(null)
    const hasVeNfts = (plan.depositVeNftTokenIds?.length ?? 0) > 0

    // veNFT contract for approval checks
    const veNftContract = useMemo(() => {
        if (!walletClient || !hasVeNfts) return null
        const signer = walletClientToSigner(walletClient)
        if (!signer) return null
        return new ethers.Contract(
            config.tokens.veNftAddress,
            [
                'function getApproved(uint256 tokenId) view returns (address)',
                'function isApprovedForAll(address owner, address operator) view returns (bool)',
                'function setApprovalForAll(address operator, bool approved)',
                'function approve(address to, uint256 tokenId)',
            ],
            signer
        )
    }, [walletClient, hasVeNfts, config.tokens.veNftAddress])

    // Check veNFT approvals on mount
    useEffect(() => {
        const checkVeNftApproval = async () => {
            if (!address || !veNftContract || !hasVeNfts) {
                setNeedsVeNftApproval(false)
                return
            }

            try {
                // First check if approved for all
                const isApprovedForAll = await veNftContract.isApprovedForAll(address, CONTRACT_ADDRESS)
                if (isApprovedForAll) {
                    setNeedsVeNftApproval(false)
                    if (initialNeedsVeNftApproval === null) {
                        setInitialNeedsVeNftApproval(false)
                    }
                    return
                }

                // If multiple NFTs, we need setApprovalForAll
                if (plan.depositVeNftTokenIds!.length > 1) {
                    setNeedsVeNftApproval(true)
                    if (initialNeedsVeNftApproval === null) {
                        setInitialNeedsVeNftApproval(true)
                    }
                    return
                }

                // For single NFT, check individual approval
                const tokenId = plan.depositVeNftTokenIds![0]
                const approvedFor = await veNftContract.getApproved(tokenId)
                const needsApproval = approvedFor.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()
                setNeedsVeNftApproval(needsApproval)
                if (initialNeedsVeNftApproval === null) {
                    setInitialNeedsVeNftApproval(needsApproval)
                }
            } catch (e) {
                console.error('Error checking veNFT approval:', e)
                setNeedsVeNftApproval(true)
                if (initialNeedsVeNftApproval === null) {
                    setInitialNeedsVeNftApproval(true)
                }
            }
        }
        checkVeNftApproval()
    }, [address, veNftContract, hasVeNfts, plan.depositVeNftTokenIds, initialNeedsVeNftApproval, CONTRACT_ADDRESS])

    // Bridge approval state - track both current state and initial state
    const [needsBridgeApproval, setNeedsBridgeApproval] = useState(true)
    const [initialNeedsBridgeApproval, setInitialNeedsBridgeApproval] = useState<boolean | null>(null)
    const [bridgeFee, setBridgeFee] = useState('0')

    // Check bridge approval on mount
    useEffect(() => {
        const checkBridge = async () => {
            if (!address || totalMintWei.eq(0)) return
            try {
                const [approvalState, feeQuote] = await Promise.all([
                    checkBridgeApproval(address, totalMintWei.toString()),
                    quoteBridgeFee(totalMintWei.toString()),
                ])
                if (hasClosedRef.current) return
                setNeedsBridgeApproval(approvalState.needsApproval)
                // Only set initial state once
                if (initialNeedsBridgeApproval === null) {
                    setInitialNeedsBridgeApproval(approvalState.needsApproval)
                }
                setBridgeFee(feeQuote.feeFormatted)
            } catch (e) {
                console.error('Error checking bridge state:', e)
            }
        }
        checkBridge()
    }, [address, totalMintWei, initialNeedsBridgeApproval])

    useEffect(() => {
        return () => {
            hasClosedRef.current = true
        }
    }, [])

    // Build steps array dynamically based on INITIAL state (so steps don't change during execution)
    const steps: Step[] = useMemo(() => {
        const list: Step[] = []

        // Use initial states if available, otherwise use current states
        const shouldIncludeAeroApproval = initialNeedsAeroApproval ?? needsAeroApproval
        const shouldIncludeBridgeApproval = initialNeedsBridgeApproval ?? needsBridgeApproval

        // Step 1: Approve AERO for minting (if needed)
        if (shouldIncludeAeroApproval && plan.depositBaseWei && BigNumber.from(plan.depositBaseWei).gt(0)) {
            list.push({
                key: 'approve',
                label: `Approve ${config.tokens.baseTokenSymbol}`,
                run: async () => {
                    if (!mintContract || !address) throw new Error('Contract not ready')

                    const tokenContract = new ethers.Contract(
                        config.tokens.baseTokenAddress,
                        ['function approve(address spender, uint256 amount) returns (bool)'],
                        (mintContract as any).signer
                    )

                    popupsActions.setIsWaitingModalOpen(true)
                    popupsActions.setWaitingPayload({
                        title: 'Waiting for confirmation',
                        text: `Approve ${config.tokens.baseTokenSymbol} for minting`,
                        status: ActionState.LOADING,
                    })

                    try {
                        // Approve only the exact amount needed, not unlimited
                        const tx = await tokenContract.approve(CONTRACT_ADDRESS, plan.depositBaseWei)
                        await tx.wait()
                        await updateAeroAllowance()
                    } finally {
                        popupsActions.setIsWaitingModalOpen(false)
                        popupsActions.setWaitingPayload({ status: ActionState.NONE })
                    }
                },
            })
        }

        // Step 2: Mint haiAERO from AERO tokens
        if (plan.depositBaseWei && BigNumber.from(plan.depositBaseWei).gt(0)) {
            list.push({
                key: 'mint',
                label: `Mint ${config.displayName}`,
                run: async () => {
                    if (!mintContract || !address) throw new Error('Contract not ready')

                    popupsActions.setIsWaitingModalOpen(true)
                    popupsActions.setWaitingPayload({
                        title: 'Waiting for confirmation',
                        text: `Mint ${config.displayName}`,
                        status: ActionState.LOADING,
                    })

                    try {
                        const gas = await (mintContract as ethers.Contract).estimateGas.deposit(
                            address,
                            plan.depositBaseWei
                        )
                        const tx = await (mintContract as ethers.Contract).deposit(address, plan.depositBaseWei, {
                            gasLimit: gas.mul(12).div(10),
                        })
                        await tx.wait()
                        await refetchAccount()
                        await refreshVault()
                    } finally {
                        popupsActions.setIsWaitingModalOpen(false)
                        popupsActions.setWaitingPayload({ status: ActionState.NONE })
                    }
                },
            })
        }

        // Step 3: Approve veNFTs for minting (if needed)
        const shouldIncludeVeNftApproval = hasVeNfts && (initialNeedsVeNftApproval ?? needsVeNftApproval)
        if (shouldIncludeVeNftApproval) {
            list.push({
                key: 'veNftApprove',
                label: `Approve ve${config.tokens.baseTokenSymbol}`,
                run: async () => {
                    if (!veNftContract || !address) throw new Error('Contract not ready')

                    popupsActions.setIsWaitingModalOpen(true)
                    popupsActions.setWaitingPayload({
                        title: 'Waiting for confirmation',
                        text: `Approve ve${config.tokens.baseTokenSymbol} for minting`,
                        status: ActionState.LOADING,
                    })

                    try {
                        // Use setApprovalForAll for simplicity (works for single or multiple NFTs)
                        const tx = await veNftContract.setApprovalForAll(CONTRACT_ADDRESS, true)
                        await tx.wait()
                        setNeedsVeNftApproval(false)
                    } finally {
                        popupsActions.setIsWaitingModalOpen(false)
                        popupsActions.setWaitingPayload({ status: ActionState.NONE })
                    }
                },
            })
        }

        // Step 4: Mint haiAERO from veNFTs
        if (hasVeNfts && plan.depositVeNftTokenIds && plan.depositVeNftTokenIds.length > 0) {
            list.push({
                key: 'mintVeNft',
                label: `Mint ${config.displayName} from ve${config.tokens.baseTokenSymbol}`,
                run: async () => {
                    if (!mintContract || !address) throw new Error('Contract not ready')

                    popupsActions.setIsWaitingModalOpen(true)
                    popupsActions.setWaitingPayload({
                        title: 'Waiting for confirmation',
                        text: `Mint ${config.displayName} from ve${config.tokens.baseTokenSymbol} NFTs`,
                        status: ActionState.LOADING,
                    })

                    try {
                        const tokenIds = plan.depositVeNftTokenIds!.map((id) => BigNumber.from(id))
                        const gas = await (mintContract as ethers.Contract).estimateGas.depositNFTs(address, tokenIds)
                        const tx = await (mintContract as ethers.Contract).depositNFTs(address, tokenIds, {
                            gasLimit: gas.mul(12).div(10),
                        })
                        await tx.wait()
                        await refetchAccount()
                        await refreshVault()
                    } finally {
                        popupsActions.setIsWaitingModalOpen(false)
                        popupsActions.setWaitingPayload({ status: ActionState.NONE })
                    }
                },
            })
        }

        // Step 5: Approve haiAERO for bridging (if needed)
        if (shouldIncludeBridgeApproval) {
            list.push({
                key: 'bridgeApprove',
                label: `Approve ${config.displayName} for Bridge`,
                run: async () => {
                    if (!walletClient || !address) throw new Error('Wallet not connected')

                    const signer = walletClientToSigner(walletClient)
                    if (!signer) throw new Error('Could not get signer')

                    popupsActions.setIsWaitingModalOpen(true)
                    popupsActions.setWaitingPayload({
                        title: 'Waiting for confirmation',
                        text: `Approve ${config.displayName} for bridging`,
                        status: ActionState.LOADING,
                    })

                    try {
                        const result = await approveBridge(signer, totalMintWei.toString())
                        await result.wait()
                        setNeedsBridgeApproval(false)
                    } finally {
                        popupsActions.setIsWaitingModalOpen(false)
                        popupsActions.setWaitingPayload({ status: ActionState.NONE })
                    }
                },
            })
        }

        // Step 6: Bridge haiAERO
        list.push({
            key: 'bridge',
            label: 'Bridge haiAERO',
            run: async () => {
                if (!walletClient || !address) throw new Error('Wallet not connected')

                const signer = walletClientToSigner(walletClient)
                if (!signer) throw new Error('Could not get signer')

                // Capture pre-bridge balance for delivery detection
                const preBridgeBalance = await getOptimismBalance(address)
                preBridgeBalanceRef.current = preBridgeBalance.raw
                console.log('[HaiAeroTxModal] Pre-bridge Optimism balance:', preBridgeBalance.raw)

                popupsActions.setIsWaitingModalOpen(true)
                popupsActions.setWaitingPayload({
                    title: 'Waiting for confirmation',
                    text: 'Confirm bridge transaction',
                    status: ActionState.LOADING,
                })

                try {
                    const result = await executeBridge(signer, totalMintWei.toString(), address)
                    setBridgeTxHash(result.txHash)
                    if (result.messageId) setBridgeMessageId(result.messageId)

                    popupsActions.setWaitingPayload({
                        title: 'Bridge Initiated',
                        text: 'Waiting for confirmation...',
                        status: ActionState.LOADING,
                    })

                    await result.wait()
                    setWaitingForDelivery(true)
                } finally {
                    popupsActions.setIsWaitingModalOpen(false)
                    popupsActions.setWaitingPayload({ status: ActionState.NONE })
                }
            },
        })

        return list
    }, [
        initialNeedsAeroApproval,
        initialNeedsBridgeApproval,
        initialNeedsVeNftApproval,
        needsAeroApproval,
        needsBridgeApproval,
        needsVeNftApproval,
        hasVeNfts,
        plan,
        config,
        mintContract,
        veNftContract,
        address,
        walletClient,
        totalMintWei,
        popupsActions,
        updateAeroAllowance,
        refetchAccount,
        refreshVault,
        CONTRACT_ADDRESS,
    ])

    // Poll for delivery after bridge step
    useEffect(() => {
        if (!waitingForDelivery || !address || !preBridgeBalanceRef.current) return

        const pollDelivery = async () => {
            try {
                const currentBalance = await getOptimismBalance(address)
                if (hasClosedRef.current) return

                const currentBN = BigNumber.from(currentBalance.raw)
                const preBridgeBN = BigNumber.from(preBridgeBalanceRef.current || '0')

                console.log(
                    '[HaiAeroTxModal] Polling - Pre-bridge:',
                    preBridgeBalanceRef.current,
                    'Current:',
                    currentBalance.raw
                )

                if (currentBN.gt(preBridgeBN)) {
                    console.log('[HaiAeroTxModal] Delivery detected! Balance increased.')
                    setWaitingForDelivery(false)
                    setDone((d) => ({ ...d, delivery: true }))
                    setIsComplete(true)
                    preBridgeBalanceRef.current = null
                }
            } catch (e) {
                console.error('Error checking delivery status:', e)
            }
        }

        const interval = setInterval(pollDelivery, 5000)
        pollDelivery() // Check immediately

        // Timeout after 10 minutes
        const timeout = setTimeout(
            () => {
                console.log('[HaiAeroTxModal] Delivery polling timeout')
                clearInterval(interval)
                // Still mark as complete even if delivery not detected
                setWaitingForDelivery(false)
                setIsComplete(true)
            },
            10 * 60 * 1000
        )

        return () => {
            clearInterval(interval)
            clearTimeout(timeout)
        }
    }, [waitingForDelivery, address])

    // Handle step execution
    const handleRun = useCallback(async () => {
        const step = steps[currentIndex]
        if (!step) return

        setPending(true)
        try {
            await step.run()
            if (hasClosedRef.current) return

            setDone((d) => ({ ...d, [step.key]: true }))

            if (currentIndex < steps.length - 1) {
                setCurrentIndex((i) => i + 1)
            } else {
                // Bridge step completed, now waiting for delivery
                if (step.key === 'bridge') {
                    // Don't set complete yet, wait for delivery
                } else {
                    setIsComplete(true)
                }
            }
        } catch (e) {
            console.error('Failed execution step', e)
        } finally {
            if (!hasClosedRef.current) {
                setPending(false)
            }
        }
    }, [steps, currentIndex])

    // Handle close
    const handleClose = useCallback(() => {
        if (hasClosedRef.current) return
        hasClosedRef.current = true
        if (isComplete) onSuccess?.()
        props.onClose?.()
    }, [isComplete, onSuccess, props])

    // Handle done button
    const handleDone = useCallback(() => {
        onSuccess?.()
        handleClose()
    }, [onSuccess, handleClose])

    // Button label
    const buttonLabel = useMemo(() => {
        if (isComplete) return 'Done'
        if (waitingForDelivery) return 'Waiting for delivery...'
        const step = steps[currentIndex]
        if (!step) return 'Done'
        switch (step.key) {
            case 'approve':
                return `Approve ${config.tokens.baseTokenSymbol}`
            case 'mint':
                return `Mint ${config.displayName}`
            case 'veNftApprove':
                return `Approve ve${config.tokens.baseTokenSymbol}`
            case 'mintVeNft':
                return `Mint from ve${config.tokens.baseTokenSymbol}`
            case 'bridgeApprove':
                return `Approve for Bridge`
            case 'bridge':
                return 'Bridge haiAERO'
            default:
                return 'Continue'
        }
    }, [steps, currentIndex, isComplete, waitingForDelivery, config])

    // Step icon helper
    const stepIcon = useCallback(
        (key: StepKey): JSX.Element | undefined => {
            const idx = steps.findIndex((s) => s.key === key)
            if (idx === -1) {
                // Special case for delivery which isn't in steps array
                if (key === 'delivery') {
                    if (done.delivery) return <Check width={16} className={ActionState.SUCCESS} />
                    if (waitingForDelivery) return <Loader size={16} color="#ff9d0a" />
                    return <Clock width={16} className="stateless" />
                }
                return undefined
            }
            if (done[key]) return <Check width={16} className={ActionState.SUCCESS} />
            if (idx === currentIndex && pending) return <Loader size={16} color="#ff9d0a" />
            return <ArrowRightCircle width={16} className="stateless" />
        },
        [steps, done, currentIndex, pending, waitingForDelivery]
    )

    // Format helper
    const fmt18 = (wei?: string) =>
        wei && BigNumber.from(wei).gt(0)
            ? formatNumberWithStyle(ethers.utils.formatUnits(wei, 18), { maxDecimals: 2 })
            : '0'

    // Build summary items
    const summaryItems = useMemo(() => {
        const items: {
            label: string
            value: { current?: string; after: string }
            icon?: JSX.Element
            isDone?: boolean
        }[] = []

        const baseWei = BigNumber.from(plan.depositBaseWei || 0)
        const veNftWei = BigNumber.from(plan.depositVeNftTotalWei || 0)

        // Use initial states to determine which items to show (so they don't disappear during execution)
        const showAeroApproval = (initialNeedsAeroApproval ?? needsAeroApproval) || done.approve
        const showVeNftApproval = hasVeNfts && ((initialNeedsVeNftApproval ?? needsVeNftApproval) || done.veNftApprove)
        const showBridgeApproval = (initialNeedsBridgeApproval ?? needsBridgeApproval) || done.bridgeApprove

        // AERO approval step (if needed) - show current allowance → needed allowance
        if (showAeroApproval) {
            const currentAllowance = aeroAllowance
                ? formatNumberWithStyle(parseFloat(ethers.utils.formatUnits(aeroAllowance, 18)), { maxDecimals: 2 })
                : '0'
            const neededAllowance = fmt18(plan.depositBaseWei)
            items.push({
                label: `Approve ${config.tokens.baseTokenSymbol}`,
                value: {
                    current: currentAllowance,
                    after: neededAllowance,
                },
                icon: stepIcon('approve'),
                isDone: done.approve,
            })
        }

        // Mint step from AERO - show current haiAERO → haiAERO after mint
        if (baseWei.gt(0)) {
            const currentV2 = parseFloat(initialBalances.v2 || '0')
            const mintAmount = parseFloat(ethers.utils.formatUnits(plan.depositBaseWei!, 18))
            const afterV2 = currentV2 + mintAmount
            items.push({
                label: `Mint ${config.displayName}`,
                value: {
                    current: formatNumberWithStyle(currentV2, { maxDecimals: 2 }),
                    after: formatNumberWithStyle(afterV2, { maxDecimals: 2 }),
                },
                icon: stepIcon('mint'),
                isDone: done.mint,
            })
        }

        // veNFT approval step (if needed)
        if (showVeNftApproval) {
            items.push({
                label: `Approve ve${config.tokens.baseTokenSymbol}`,
                value: { after: `${plan.depositVeNftTokenIds?.length || 0} NFT(s)` },
                icon: stepIcon('veNftApprove'),
                isDone: done.veNftApprove,
            })
        }

        // Mint step from veNFTs
        if (hasVeNfts && veNftWei.gt(0)) {
            // Calculate the running balance after AERO mint (if any)
            const afterAeroMint =
                parseFloat(initialBalances.v2 || '0') +
                (baseWei.gt(0) ? parseFloat(ethers.utils.formatUnits(plan.depositBaseWei!, 18)) : 0)
            const veNftMintAmount = parseFloat(ethers.utils.formatUnits(plan.depositVeNftTotalWei!, 18))
            const afterVeNftMint = afterAeroMint + veNftMintAmount
            items.push({
                label: `Mint from ve${config.tokens.baseTokenSymbol}`,
                value: {
                    current: formatNumberWithStyle(afterAeroMint, { maxDecimals: 2 }),
                    after: formatNumberWithStyle(afterVeNftMint, { maxDecimals: 2 }),
                },
                icon: stepIcon('mintVeNft'),
                isDone: done.mintVeNft,
            })
        }

        // Bridge approval step (if needed)
        if (showBridgeApproval) {
            items.push({
                label: `Approve for Bridge`,
                value: { after: fmt18(totalMintWei.toString()) },
                icon: stepIcon('bridgeApprove'),
                isDone: done.bridgeApprove,
            })
        }

        // Bridge step
        items.push({
            label: 'Bridge haiAERO',
            value: { after: fmt18(totalMintWei.toString()) },
            icon: stepIcon('bridge'),
            isDone: done.bridge,
        })

        // Delivery status
        if (done.bridge || waitingForDelivery || done.delivery) {
            items.push({
                label: 'Tokens Delivered',
                value: { after: done.delivery ? 'Complete!' : 'Waiting...' },
                icon: stepIcon('delivery'),
                isDone: done.delivery,
            })
        }

        return items
    }, [
        plan,
        config,
        initialBalances,
        initialNeedsAeroApproval,
        initialNeedsBridgeApproval,
        initialNeedsVeNftApproval,
        needsAeroApproval,
        needsBridgeApproval,
        needsVeNftApproval,
        hasVeNfts,
        aeroAllowance,
        done,
        totalMintWei,
        stepIcon,
        waitingForDelivery,
    ])

    return (
        <Modal
            onClose={handleClose}
            {...props}
            maxWidth="600px"
            ignoreWaiting={true}
            overrideContent={
                <>
                    <Modal.Header>
                        <BrandedTitle
                            textContent={`MINT & BRIDGE ${config.displayName.toUpperCase()}`}
                            $fontSize="2em"
                        />
                        {props.onClose && (
                            <Modal.Close onClick={handleClose}>
                                <X size={14} />
                            </Modal.Close>
                        )}
                    </Modal.Header>
                    <ModalBody>
                        <Flex $width="100%" $column $gap={16} $align="flex-start" $justify="flex-start">
                            <Description>
                                Convert {config.tokens.baseTokenSymbol} to {config.displayName}, then bridge to Optimism
                                to use as vault collateral.
                            </Description>

                            <TransactionSummary heading="Transaction Steps" items={summaryItems} />

                            {/* Bridge fee info */}
                            {bridgeFee && parseFloat(bridgeFee) > 0 && (
                                <FeeRow>
                                    <Text $fontSize="0.85em" $color="rgba(0,0,0,0.6)">
                                        Estimated Bridge Fee
                                    </Text>
                                    <Text $fontSize="0.85em" $fontWeight={600}>
                                        ~{formatNumberWithStyle(parseFloat(bridgeFee), { maxDecimals: 6 })} ETH
                                    </Text>
                                </FeeRow>
                            )}

                            {/* Waiting for delivery message */}
                            {waitingForDelivery && (
                                <DeliveryStatus>
                                    <Loader size={16} color="#ff9d0a" />
                                    <Flex $column $gap={4}>
                                        <Text $fontWeight={600}>Bridge in progress</Text>
                                        <Text $fontSize="0.85em" $color="rgba(0,0,0,0.6)">
                                            Waiting for tokens to arrive on Optimism (checking every 5 seconds)
                                        </Text>
                                        {bridgeTxHash && (
                                            <ExplorerLink
                                                href={
                                                    bridgeMessageId
                                                        ? `https://explorer.hyperlane.xyz/message/${bridgeMessageId}`
                                                        : `https://explorer.hyperlane.xyz/?search=${bridgeTxHash}`
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Tx: {bridgeTxHash}
                                            </ExplorerLink>
                                        )}
                                    </Flex>
                                </DeliveryStatus>
                            )}

                            {/* Success message */}
                            {isComplete && done.delivery && (
                                <SuccessStatus>
                                    <Check width={20} className={ActionState.SUCCESS} />
                                    <Flex $column $gap={4}>
                                        <Text $fontWeight={600} $color="#22c55e">
                                            Complete!
                                        </Text>
                                        <Text $fontSize="0.85em">
                                            Your {config.displayName} has been delivered to Optimism. You can now use it
                                            as collateral in HAI vaults.
                                        </Text>
                                    </Flex>
                                </SuccessStatus>
                            )}
                        </Flex>
                    </ModalBody>
                    <ModalFooter $gap={24} $justify="flex-end">
                        <HaiButton
                            $variant="yellowish"
                            disabled={pending || waitingForDelivery}
                            onClick={isComplete ? handleDone : handleRun}
                        >
                            {buttonLabel}
                        </HaiButton>
                    </ModalFooter>
                </>
            }
        />
    )
}

const Description = styled(Text)`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        font-size: ${theme.font.small};
    `}
`

const FeeRow = styled(Flex)`
    width: 100%;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 8px;
`

const DeliveryStatus = styled(Flex)`
    width: 100%;
    gap: 12px;
    align-items: flex-start;
    padding: 16px;
    border-radius: 12px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
`

const ExplorerLink = styled.a`
    font-size: 0.8em;
    color: rgba(0, 0, 0, 0.5);
    word-break: break-all;
    text-decoration: underline;

    &:hover {
        color: rgba(0, 0, 0, 0.8);
    }
`

const SuccessStatus = styled(Flex)`
    width: 100%;
    gap: 12px;
    align-items: flex-start;
    padding: 16px;
    border-radius: 12px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);

    svg {
        stroke: #22c55e;
    }
`

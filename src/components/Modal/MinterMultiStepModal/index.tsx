/**
 * MinterMultiStepModal
 *
 * Multi-step transaction modal for minting and optionally bridging minter tokens.
 * Used for both haiVELO (Optimism) and haiAERO (Base -> Optimism).
 */

import { useMemo, useRef, useState } from 'react'

import { Approvals, type MinterApprovalItem } from './Approvals'
import { MintExecute } from './MintExecute'
import { BridgeExecute } from './BridgeExecute'
import { Modal, type ModalProps } from '../index'
import { BrandedTitle } from '~/components/BrandedTitle'
import { X } from '~/components/Icons/X'
import type { MinterProtocolConfig } from '~/types/minterProtocol'

export type MintExecutionPlan = {
    depositBaseWei?: string
    depositVeNftTokenIds?: string[]
    depositVeNftTotalWei?: string
    migrateV1Wei?: string
}

export type MinterMultiStepModalProps = ModalProps & {
    config: MinterProtocolConfig
    items: MinterApprovalItem[]
    plan: MintExecutionPlan
    includeBridge?: boolean
    bridgeAmount?: string
    onAllApproved: () => void
    onStepDone: (step: 'depositBase' | 'depositVeNfts' | 'migrateV1' | 'bridge') => void
}

type Phase = 'approvals' | 'mint' | 'bridge' | 'complete'

export function MinterMultiStepModal({
    config,
    items,
    plan,
    includeBridge = false,
    bridgeAmount,
    onAllApproved,
    onStepDone,
    ...props
}: MinterMultiStepModalProps) {
    const hasClosedRef = useRef(false)

    // Determine initial phase
    const initialPhase: Phase = items.length > 0 ? 'approvals' : 'mint'
    const [phase, setPhase] = useState<Phase>(initialPhase)
    const [mintedAmount, setMintedAmount] = useState<string>('')

    const handleClose = () => {
        if (hasClosedRef.current) return
        hasClosedRef.current = true
        props.onClose?.()
    }

    // Title based on protocol and current phase
    const title = useMemo(() => {
        const protocolName = config.displayName.toUpperCase()
        switch (phase) {
            case 'approvals':
                return `MINT ${protocolName}`
            case 'mint':
                return `MINT ${protocolName}`
            case 'bridge':
                return `BRIDGE ${protocolName}`
            case 'complete':
                return `${protocolName} COMPLETE`
            default:
                return protocolName
        }
    }, [config.displayName, phase])

    const content = useMemo(() => {
        switch (phase) {
            case 'approvals':
                return (
                    <Approvals
                        items={items}
                        onAllApproved={() => {
                            setPhase('mint')
                        }}
                    />
                )
            case 'mint':
                return (
                    <MintExecute
                        config={config}
                        plan={plan}
                        includeBridge={includeBridge}
                        onDone={(totalMintedWei) => {
                            if (includeBridge && bridgeAmount) {
                                setMintedAmount(totalMintedWei || bridgeAmount)
                                setPhase('bridge')
                            } else {
                                onAllApproved()
                            }
                        }}
                        onStepDone={(step) => {
                            if (step === 'depositBase') onStepDone('depositBase')
                            if (step === 'depositVeNfts') onStepDone('depositVeNfts')
                            if (step === 'migrateV1') onStepDone('migrateV1')
                        }}
                    />
                )
            case 'bridge':
                return (
                    <BridgeExecute
                        config={config}
                        amountToBridge={mintedAmount || bridgeAmount || '0'}
                        onDone={() => {
                            onStepDone('bridge')
                            onAllApproved()
                        }}
                    />
                )
            case 'complete':
                return null
            default:
                return null
        }
    }, [phase, items, config, plan, includeBridge, bridgeAmount, mintedAmount, onAllApproved, onStepDone])

    return (
        <Modal
            onClose={handleClose}
            {...props}
            maxWidth={'720px'}
            ignoreWaiting={true}
            overrideContent={
                <>
                    <Modal.Header>
                        <BrandedTitle textContent={title} $fontSize="2.5em" />
                        {props.onClose && (
                            <Modal.Close onClick={handleClose}>
                                <X size={14} />
                            </Modal.Close>
                        )}
                    </Modal.Header>
                    {content}
                </>
            }
        />
    )
}

// Re-export types for convenience
export type { MinterApprovalItem } from './Approvals'


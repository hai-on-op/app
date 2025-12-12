import { useEffect, useMemo } from 'react'
import { ActionState } from '~/utils'
// import { useStoreState } from '~/store'
import { ApprovalState, useTokenApproval } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, HaiButton, Text } from '~/styles'
import { ModalBody, ModalFooter } from '../index'
import { ArrowUpCircle, CheckCircle } from 'react-feather'
import { Loader } from '~/components/Loader'
import type { StakingConfig } from '~/types/stakingConfig'

type ApprovalsProps = {
    onNext: () => void
    isStaking: boolean
    isWithdraw?: boolean
    amount: string
    config?: StakingConfig
}

export function Approvals({ onNext, isStaking, isWithdraw = false, amount, config }: ApprovalsProps) {
    // const {
    //     connectWalletModel: { proxyAddress },
    // } = useStoreState((state) => state)

    // Determine which token needs approval based on operation type
    const configStToken = config?.addresses.stToken
    const configStakeToken = config?.addresses.stakeToken
    const configManager = config?.addresses.manager

    const stakeToken = isStaking
        ? configStakeToken || (import.meta.env.VITE_KITE_ADDRESS as string)
        : configStToken || (import.meta.env.VITE_STAKING_TOKEN_ADDRESS as string)
    const manager = configManager || (import.meta.env.VITE_STAKING_MANAGER as string)
    const decimals = String(config?.decimals ?? 18)

    // Check if we're using fallback addresses (this would be wrong for LP pools!)
    const usingFallbackToken = isStaking ? !configStakeToken : !configStToken
    const usingFallbackManager = !configManager

    const [kiteApproval, approveKite] = useTokenApproval(amount, stakeToken, manager, decimals, true)

    const tokenLabel = config?.labels.token || 'KITE'
    const stTokenLabel = config?.labels.stToken || 'stKITE'

    // DEBUG: Log all approval-related values
    console.log('╔══════════════════════════════════════════════════════════════╗')
    console.log('║                    APPROVAL CHECK DEBUG                       ║')
    console.log('╠══════════════════════════════════════════════════════════════╣')
    console.log('║ OPERATION TYPE:')
    console.log('║   isStaking:', isStaking)
    console.log('║   isWithdraw:', isWithdraw)
    console.log('║   amount:', amount)
    console.log('╠══════════════════════════════════════════════════════════════╣')
    console.log('║ CONFIG:')
    console.log('║   defined?:', !!config)
    console.log('║   namespace:', config?.namespace || 'N/A (using default KITE)')
    console.log('║   token label:', tokenLabel)
    console.log('║   stToken label:', stTokenLabel)
    console.log('╠══════════════════════════════════════════════════════════════╣')
    console.log('║ CONFIG ADDRESSES:')
    console.log('║   stakeToken (original token):', configStakeToken || 'NOT SET')
    console.log('║   stToken (receipt token):', configStToken || 'NOT SET')
    console.log('║   manager:', configManager || 'NOT SET')
    console.log('╠══════════════════════════════════════════════════════════════╣')
    console.log('║ FALLBACK ENV ADDRESSES:')
    console.log('║   VITE_KITE_ADDRESS:', import.meta.env.VITE_KITE_ADDRESS)
    console.log('║   VITE_STAKING_TOKEN_ADDRESS:', import.meta.env.VITE_STAKING_TOKEN_ADDRESS)
    console.log('║   VITE_STAKING_MANAGER:', import.meta.env.VITE_STAKING_MANAGER)
    console.log('╠══════════════════════════════════════════════════════════════╣')
    console.log('║ 🔍 ACTUAL APPROVAL CHECK:')
    console.log('║   Checking approval of TOKEN:', stakeToken)
    console.log('║   To SPENDER (manager):', manager)
    console.log('║   For AMOUNT:', amount)
    console.log('║')
    console.log(
        '║   ⚠️ Using fallback token?:',
        usingFallbackToken,
        usingFallbackToken ? '← PROBLEM! Should use config address' : '✓'
    )
    console.log(
        '║   ⚠️ Using fallback manager?:',
        usingFallbackManager,
        usingFallbackManager ? '← PROBLEM! Should use config address' : '✓'
    )
    console.log('╠══════════════════════════════════════════════════════════════╣')
    console.log('║ APPROVAL RESULT:')
    console.log('║   State:', ApprovalState[kiteApproval], `(${kiteApproval})`)
    console.log('╚══════════════════════════════════════════════════════════════╝')

    const { isApproved, button } = useMemo(() => {
        console.log('=== APPROVAL useMemo ===')
        console.log(
            'Checking: !isStaking && !isWithdraw && !amount =>',
            !isStaking,
            '&&',
            !isWithdraw,
            '&&',
            !amount,
            '=',
            !isStaking && !isWithdraw && !amount
        )

        if (!isStaking && !isWithdraw && !amount) {
            console.log('SKIPPING: Early return because !isStaking && !isWithdraw && !amount')
            return { isApproved: true, button: null }
        }

        console.log('kiteApproval === ApprovalState.APPROVED:', kiteApproval === ApprovalState.APPROVED)
        console.log('kiteApproval value:', kiteApproval, '| APPROVED value:', ApprovalState.APPROVED)

        // Only treat as approved if we explicitly know it's approved
        // Never auto-approve on unknown or unexpected states
        if (kiteApproval === ApprovalState.APPROVED) {
            console.log('RESULT: isApproved = true (user has approval)')
            return {
                isApproved: true,
                button: null,
            }
        }

        console.log('RESULT: isApproved = false (user needs approval)')
        // For all other states (NOT_APPROVED, PENDING, UNKNOWN, or any unexpected value),
        // show the approval UI
        return {
            isApproved: false,
            button: (
                <HaiButton
                    $variant="yellowish"
                    $width="100%"
                    $justify="center"
                    disabled={kiteApproval === ApprovalState.PENDING || kiteApproval === ApprovalState.UNKNOWN}
                    onClick={approveKite}
                >
                    {kiteApproval === ApprovalState.PENDING
                        ? 'Pending Approval..'
                        : kiteApproval === ApprovalState.UNKNOWN
                        ? 'Checking Approval...'
                        : `Approve ${isStaking ? tokenLabel : stTokenLabel}`}
                </HaiButton>
            ),
        }
    }, [kiteApproval, approveKite, isStaking, isWithdraw, amount, tokenLabel, stTokenLabel])

    useEffect(() => {
        console.log('=== APPROVAL useEffect ===')
        console.log('isApproved:', isApproved)
        if (isApproved) {
            console.log('CALLING onNext() - advancing to next step!')
        }
        if (isApproved) onNext()
    }, [isApproved, onNext])

    const statusIcon = useMemo(() => {
        if (kiteApproval === ApprovalState.APPROVED) {
            return <CheckCircle width="40px" className={ActionState.SUCCESS} />
        }
        if (kiteApproval === ApprovalState.PENDING) {
            return <Loader size={40} />
        }
        return <ArrowUpCircle width={'40px'} className={'stateless'} />
    }, [kiteApproval])

    return (
        <>
            <ModalBody>
                <ImageContainer>{statusIcon}</ImageContainer>
                <Text $fontWeight={700}>Token Approvals</Text>
                <Text>Allow Staking Manager to manage your {isStaking ? tokenLabel : stTokenLabel} tokens</Text>
            </ModalBody>
            <ModalFooter $gap={24}>{button}</ModalFooter>
        </>
    )
}

const ImageContainer = styled(CenteredFlex).attrs((props) => ({
    $width: '100%',
    ...props,
}))`
    svg {
        margin-top: 12px;
        height: 40px;
        stroke: ${({ theme }) => theme.colors.blueish};
        path {
            stroke-width: 1 !important;
        }
        &.${ActionState.NONE} {
            stroke: black;
        }
        &.${ActionState.SUCCESS} {
            stroke: ${({ theme }) => theme.colors.successColor};
        }
        &.${ActionState.ERROR} {
            stroke: ${({ theme }) => theme.colors.dangerColor};
        }
    }
`

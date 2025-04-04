import { useEffect, useMemo } from 'react'
import { ActionState } from '~/utils'
import { useStoreState } from '~/store'
import { ApprovalState, useTokenApproval } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, HaiButton, Text } from '~/styles'
import { ModalBody, ModalFooter } from '../index'
import { ArrowUpCircle, CheckCircle } from 'react-feather'
import { Loader } from '~/components/Loader'

type ApprovalsProps = {
    onNext: () => void
    isStaking: boolean
    amount: string
}

export function Approvals({ onNext, isStaking, amount }: ApprovalsProps) {
    const {
        connectWalletModel: { proxyAddress },
    } = useStoreState((state) => state)

    const [kiteApproval, approveKite] = useTokenApproval(
        amount,
        isStaking ? import.meta.env.VITE_KITE_ADDRESS : import.meta.env.VITE_STAKING_TOKEN_ADDRESS,
        import.meta.env.VITE_STAKING_MANAGER,
        '18',
        true
    )

    console.log('import.meta.env', import.meta.env)

    // debugger

    const { isApproved, button } = useMemo(() => {
        if (!isStaking && !amount) {
            return { isApproved: true, button: null }
        }

        switch (kiteApproval) {
            case ApprovalState.NOT_APPROVED:
            case ApprovalState.PENDING:
            case ApprovalState.UNKNOWN:
                return {
                    isApproved: false,
                    button: (
                        <HaiButton
                            $variant="yellowish"
                            $width="100%"
                            $justify="center"
                            disabled={kiteApproval === ApprovalState.PENDING}
                            onClick={approveKite}
                        >
                            {kiteApproval === ApprovalState.PENDING
                                ? 'Pending Approval..'
                                : `Approve ${isStaking ? 'KITE' : 'stKITE'}`}
                        </HaiButton>
                    ),
                }
            case ApprovalState.APPROVED:
            default:
                return {
                    isApproved: true,
                    button: null,
                }
        }
    }, [kiteApproval, approveKite, isStaking, amount])

    useEffect(() => {
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
                <Text>Allow Staking Manager to manage your {isStaking ? 'KITE' : 'stKITE'} tokens</Text>
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

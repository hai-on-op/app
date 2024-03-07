import { useEffect, useMemo } from 'react'

import { ActionState, VaultAction } from '~/utils'
import { useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { ApprovalState, useTokenApproval } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, HaiButton, Text } from '~/styles'
import { ModalBody, ModalFooter } from '../index'
import { ArrowUpCircle, CheckCircle } from 'react-feather'
import { Loader } from '~/components/Loader'

type ApprovalsProps = {
    onNext: () => void
}
export function Approvals({ onNext }: ApprovalsProps) {
    const {
        connectWalletModel: { proxyAddress },
        vaultModel: vaultState,
    } = useStoreState((state) => state)

    const { action, formState, error, collateral, debt } = useVault()

    const isWithdraw = action === VaultAction.WITHDRAW_REPAY || action === VaultAction.WITHDRAW_BORROW
    const isRepay = action === VaultAction.WITHDRAW_REPAY || action === VaultAction.DEPOSIT_REPAY

    const [collateralApproval, approveCollateral] = useTokenApproval(
        isWithdraw ? formState.withdraw || '0' : formState.deposit || '0',
        collateral.data?.address,
        proxyAddress,
        collateral.data?.decimals.toString(),
        true
    )

    const [debtApproval, approveDebtUnlock] = useTokenApproval(
        isRepay ? formState.repay || '0' : formState.borrow || '0',
        debt.data?.address,
        proxyAddress,
        debt.data?.decimals.toString() || '18',
        true,
        isRepay && formState.repay === debt.available.raw
    )

    const [buttonActive, buttonLabel] = useMemo(() => {
        let label = ''
        switch (action) {
            case VaultAction.CREATE: {
                const { deposit = '0', borrow = '0' } = formState
                if (Number(deposit) <= 0 || Number(borrow) <= 0) {
                    return [false, 'Open Vault']
                }
                label = 'Open Vault'
                break
            }
            case VaultAction.DEPOSIT_BORROW: {
                const { deposit = '0', borrow = '0' } = formState
                if (Number(deposit) <= 0 && Number(borrow) <= 0) {
                    return [false, 'Deposit']
                }
                if (Number(borrow) <= 0) label = 'Deposit'
                else if (Number(deposit) <= 0) label = 'Borrow'
                else label = 'Deposit & Borrow'
                break
            }
            case VaultAction.DEPOSIT_REPAY: {
                const { deposit = '0', repay = '0' } = formState
                if (Number(deposit) <= 0 && Number(repay) <= 0) {
                    return [false, 'Deposit']
                }
                if (Number(repay) <= 0) label = 'Deposit'
                else if (Number(deposit) <= 0) label = 'Pay Back'
                else label = 'Deposit & Pay Back'
                break
            }
            case VaultAction.WITHDRAW_REPAY: {
                const { withdraw = '0', repay = '0' } = formState
                if (Number(withdraw) <= 0 && Number(repay) <= 0) {
                    return [false, 'Withdraw']
                }
                if (Number(repay) <= 0) label = 'Withdraw'
                else if (Number(withdraw) <= 0) label = 'Pay Back'
                else label = 'Withdraw & Pay Back'
                break
            }
            case VaultAction.WITHDRAW_BORROW: {
                const { withdraw = '0', borrow = '0' } = formState
                if (Number(withdraw) <= 0 && Number(borrow) <= 0) {
                    return [false, 'Withdraw']
                }
                if (Number(borrow) <= 0) label = 'Withdraw'
                else if (Number(withdraw) <= 0) label = 'Borrow'
                else label = 'Withdraw & Borrow'
                break
            }
            default:
                return [false, 'Deposit']
        }
        return [!error, label]
    }, [action, formState, error])

    const { isApproved, button } = useMemo(() => {
        switch (action) {
            case VaultAction.DEPOSIT_BORROW:
            case VaultAction.CREATE:
                switch (collateralApproval) {
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
                                    disabled={!buttonActive || collateralApproval === ApprovalState.PENDING}
                                    onClick={approveCollateral}
                                >
                                    {collateralApproval === ApprovalState.PENDING
                                        ? 'Pending Approval..'
                                        : `Approve ${collateral.name}`}
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
            case VaultAction.WITHDRAW_REPAY: {
                switch (debtApproval) {
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
                                    disabled={!buttonActive || debtApproval === ApprovalState.PENDING}
                                    onClick={approveDebtUnlock}
                                >
                                    {debtApproval === ApprovalState.PENDING ? 'Pending Approval..' : `Approve HAI`}
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
            }
            case VaultAction.DEPOSIT_REPAY: {
                switch (collateralApproval) {
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
                                    disabled={!buttonActive || collateralApproval === ApprovalState.PENDING}
                                    onClick={approveCollateral}
                                >
                                    {collateralApproval === ApprovalState.PENDING
                                        ? 'Pending Approval..'
                                        : `Approve ${collateral.name}`}
                                </HaiButton>
                            ),
                        }
                    case ApprovalState.APPROVED:
                    default: {
                        switch (debtApproval) {
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
                                            disabled={!buttonActive || debtApproval === ApprovalState.PENDING}
                                            onClick={approveDebtUnlock}
                                        >
                                            {debtApproval === ApprovalState.PENDING
                                                ? 'Pending Approval..'
                                                : `Approve HAI`}
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
                    }
                }
            }
            case VaultAction.WITHDRAW_BORROW: {
                return {
                    isApproved: true,
                    button: null,
                }
            }
            default:
                return {
                    isApproved: true,
                    button: null,
                }
        }
    }, [
        action,
        vaultState,
        buttonActive,
        buttonLabel,
        collateral,
        collateralApproval,
        approveCollateral,
        debtApproval,
        approveDebtUnlock,
        onNext,
    ])

    useEffect(() => {
        if (isApproved) onNext()
    }, [isApproved, onNext])

    const statusIcon = useMemo(() => {
        if (collateralApproval === ApprovalState.APPROVED && debtApproval === ApprovalState.APPROVED) {
            return <CheckCircle width="40px" className={ActionState.SUCCESS} />
        }
        if (collateralApproval === ApprovalState.PENDING || debtApproval === ApprovalState.PENDING) {
            return <Loader size={40} />
        }
        return <ArrowUpCircle width={'40px'} className={'stateless'} />
    }, [collateralApproval, debtApproval])

    return (
        <>
            <ModalBody>
                <ImageContainer>{statusIcon}</ImageContainer>
                <Text $fontWeight={700}>Token Approvals</Text>
                <Text>Allow your account to manage your tokens</Text>
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
            stroke-width: 2;
            width: 60px !important;
            height: 60px !important;
            margin-bottom: 20px;
        }
    }
`

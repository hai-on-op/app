import { useMemo, useState } from 'react'

import { ActionState, VaultAction, formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { ApprovalState, useProxyAddress, useTokenApproval } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { NumberInput } from '~/components/NumberInput'
import { WrapETHModal } from '~/components/Modal/WrapETHModal'
import { ReviewVaultTxModal } from '~/components/Modal/ReviewVaultTxModal'
import { VaultActionError } from './VaultActionError'

export function VaultActions() {
    const proxyAddress = useProxyAddress()
    const { vaultModel: vaultState } = useStoreState(state => state)
    const { vaultModel: vaultActions } = useStoreActions(actions => actions)

    const {
        vault,
        action,
        setAction,
        formState,
        updateForm,
        collateral,
        debt,
        error,
    } = useVault()

    const [collateralApproval, approveCollateral] = useTokenApproval(
        action === VaultAction.WITHDRAW_REPAY
            ? formState.withdraw || '0'
            : formState.deposit || '0',
        collateral.data?.address,
        proxyAddress,
        collateral.data?.decimals.toString(),
        true
    )

    const [debtApproval, approveDebtUnlock] = useTokenApproval(
        action === VaultAction.WITHDRAW_REPAY
            ? formState.repay || '0'
            : formState.borrow || '0',
        debt.data?.address,
        proxyAddress,
        debt.data?.decimals.toString() || '18',
        true,
        action === VaultAction.WITHDRAW_REPAY && formState.repay === debt.available
    )

    const [reviewActive, setReviewActive] = useState(false)
    const [wrapEthActive, setWrapEthActive] = useState(false)

    const [buttonActive, buttonLabel] = useMemo(() => {
        let label = ''
        switch(action) {
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
            case VaultAction.WITHDRAW_REPAY: {
                const { withdraw = '0', repay = '0' } = formState
                if (Number(withdraw) <= 0 && Number(repay) <= 0) {
                    return [false, 'Withdraw']
                }
                if (Number(repay) <= 0) label = 'Withdraw'
                else if (Number(withdraw) <= 0) label = 'Pay Back'
                else  label = 'Withdraw & Pay Back'
                break
            }
            default: return [false, 'Deposit']
        }
        return [!error, label]
    }, [action, formState, error])

    const button = useMemo(() => {
        switch(action) {
            case VaultAction.DEPOSIT_BORROW:
            case VaultAction.CREATE:
                switch(collateralApproval) {
                    case ApprovalState.NOT_APPROVED:
                    case ApprovalState.PENDING:
                    case ApprovalState.UNKNOWN:
                        return (
                            <HaiButton
                                $variant="yellowish"
                                $width="100%"
                                $justify="center"
                                disabled={!buttonActive || collateralApproval === ApprovalState.PENDING}
                                onClick={approveCollateral}>
                                {collateralApproval === ApprovalState.PENDING
                                    ? 'Pending Approval..'
                                    : `Unlock ${collateral.name}`
                                }
                            </HaiButton>
                        )
                    case ApprovalState.APPROVED:
                    default:
                        return (
                            <HaiButton
                                $variant="yellowish"
                                $width="100%"
                                $justify="center"
                                disabled={!buttonActive || vaultState.transactionState === ActionState.LOADING}
                                onClick={() => setReviewActive(true)}>
                                {vaultState.transactionState === ActionState.LOADING
                                    ? 'Pending Transaction...'
                                    : `Review ${buttonLabel}`
                                }
                            </HaiButton>
                        )
                }
            case VaultAction.WITHDRAW_REPAY: {
                switch(debtApproval) {
                    case ApprovalState.NOT_APPROVED:
                    case ApprovalState.PENDING:
                    case ApprovalState.UNKNOWN:
                        return (
                            <HaiButton
                                $variant="yellowish"
                                $width="100%"
                                $justify="center"
                                disabled={!buttonActive || collateralApproval === ApprovalState.PENDING}
                                onClick={approveDebtUnlock}>
                                {collateralApproval === ApprovalState.PENDING
                                    ? 'Pending Approval..'
                                    : `Unlock HAI`
                                }
                            </HaiButton>
                        )
                    case ApprovalState.APPROVED:
                    default:
                        return (
                            <HaiButton
                                $variant="yellowish"
                                $width="100%"
                                $justify="center"
                                disabled={!buttonActive || vaultState.transactionState === ActionState.LOADING}
                                onClick={() => setReviewActive(true)}>
                                {vaultState.transactionState === ActionState.LOADING
                                    ? 'Pending Transaction...'
                                    : `Review ${buttonLabel}`
                                }
                            </HaiButton>
                        )
                }
            }
        }
    }, [
        action, vaultState, buttonActive, buttonLabel,
        collateral, collateralApproval, approveCollateral,
        debtApproval, approveDebtUnlock,
    ])

    const isDepositBorrowOrCreate = action === VaultAction.DEPOSIT_BORROW || action === VaultAction.CREATE

    return (<>
        {reviewActive && (
            <ReviewVaultTxModal onClose={() => {
                setReviewActive(false)
                vaultActions.setTransactionState(ActionState.NONE)
            }}/>
        )}
        <Container>
            <Header $pad={action === VaultAction.CREATE}>
                <Flex
                    $width="100%"
                    $justify="space-between"
                    $align="center">
                    <Text $fontWeight={700}>
                        {action === VaultAction.CREATE
                            ? 'Open New Vault'
                            : `Manage Vault #${vault?.id}`
                        }
                    </Text>
                    {Object.values(formState).some(value => Number(value || '0') > 0) && (
                        <Text
                            $color="rgba(0,0,0,0.5)"
                            $fontSize="0.8em"
                            $textDecoration="underline"
                            onClick={() => updateForm('clear')}
                            style={{ cursor: 'pointer' }}>
                            Clear All
                        </Text>
                    )}
                </Flex>
                {action !== VaultAction.CREATE && (
                    <Grid $columns="1fr 1fr">
                        <HeaderNav
                            $active={action === VaultAction.DEPOSIT_BORROW}
                            onClick={() => setAction(VaultAction.DEPOSIT_BORROW)}>
                            Deposit & Borrow
                        </HeaderNav>
                        <HeaderNav
                            $active={action === VaultAction.WITHDRAW_REPAY}
                            onClick={() => setAction(VaultAction.WITHDRAW_REPAY)}>
                            Withdraw & Pay Back
                        </HeaderNav>
                    </Grid>
                )}
            </Header>
            <Body>
                <NumberInput
                    label="Deposit"
                    subLabel={`Max ${formatNumberWithStyle(collateral.balance, { maxDecimals: 4 })} ${collateral.name}`}
                    placeholder="Deposit Amount"
                    unitLabel={collateral.name}
                    onChange={(value: string) => updateForm({ deposit: value || undefined })}
                    value={formState.deposit}
                    hidden={!isDepositBorrowOrCreate}
                    onMax={() => updateForm({ deposit: collateral.balance })}
                    conversion={formState.deposit && Number(formState.deposit) > 0
                        ? `~${formatNumberWithStyle(
                            parseFloat(collateral.priceInUSD || '0') * parseFloat(formState.deposit),
                            { style: 'currency' }
                        )}`
                        : ''
                    }
                />
                <NumberInput
                    label="Withdraw"
                    subLabel={`Max ${collateral.available} ${collateral.name}`}
                    placeholder="Withdraw Amount"
                    unitLabel={collateral.name}
                    onChange={(value: string) => updateForm({ withdraw: value || undefined })}
                    value={formState.withdraw}
                    hidden={action !== VaultAction.WITHDRAW_REPAY}
                    onMax={() => updateForm({ withdraw: collateral.available })}
                    conversion={formState.withdraw && Number(formState.withdraw) > 0
                        ? `~${formatNumberWithStyle(
                            parseFloat(collateral.priceInUSD || '0') * parseFloat(formState.withdraw),
                            { style: 'currency' }
                        )}`
                        : ''
                    }
                />
                <NumberInput
                    label="Borrow"
                    subLabel={`Max ${formatNumberWithStyle(debt.available, { maxDecimals: 4 })} HAI`}
                    placeholder="Borrow Amount"
                    unitLabel="HAI"
                    onChange={(value: string) => updateForm({ borrow: value || undefined })}
                    value={formState.borrow}
                    hidden={!isDepositBorrowOrCreate}
                    onMax={() => updateForm({ borrow: debt.available })}
                    conversion={formState.borrow && Number(formState.borrow) > 0
                        ? `~${formatNumberWithStyle(
                            parseFloat(debt.priceInUSD) * parseFloat(formState.borrow),
                            { style: 'currency' }
                        )}`
                        : ''
                    }
                />
                <NumberInput
                    label="Pay Back"
                    subLabel={`Max ${formatNumberWithStyle(debt.available, { maxDecimals: 4 })} HAI`}
                    placeholder="Pay Back Amount"
                    unitLabel="HAI"
                    onChange={(value: string) => updateForm({ repay: value || undefined })}
                    value={formState.repay}
                    hidden={action !== VaultAction.WITHDRAW_REPAY}
                    onMax={() => updateForm({ repay: debt.available })}
                    conversion={formState.repay && Number(formState.repay) > 0
                        ? `~${formatNumberWithStyle(
                            parseFloat(debt.priceInUSD) * parseFloat(formState.repay),
                            { style: 'currency' }
                        )}`
                        : ''
                    }
                />
                {collateral.name === 'WETH' && isDepositBorrowOrCreate && (<>
                    <WrapEthText onClick={() => setWrapEthActive(true)}>
                        Need WETH?&nbsp;
                        <Text
                            as="span"
                            $fontWeight={700}
                            $textDecoration="underline">
                            Click here to wrap
                        </Text>
                    </WrapEthText>
                    {wrapEthActive && <WrapETHModal onClose={() => setWrapEthActive(false)}/>}
                </>)}
                <VaultActionError/>
            </Body>
            <Footer>
                {button}
            </Footer>
        </Container>
    </>)
}

const Container = styled(Flex).attrs(props => ({
    $column: true,
    $shrink: 0,
    ...props,
}))`
    max-width: 100%;
    width: 360px;
    height: 564px;
    margin-bottom: -140px;
    background-color: ${({ theme }) => theme.colors.background};
    border-radius: 24px;
    border: ${({ theme }) => theme.border.medium};
`
const Header = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-end',
    $align: 'flex-start',
    $gap: 12,
    ...props,
}))<{ $pad?: boolean }>`
    padding-top: 24px;
    border-bottom: ${({ theme }) => theme.border.thin};
    padding-bottom: ${({ $pad }) => $pad ? '24px': '0px'};

    & > *:first-child {
        padding: 0 24px;
    }
`
const HeaderNav = styled(CenteredFlex)<{ $active?: boolean, $disabled?: boolean }>`
    padding: 12px;
    border-bottom: 2px solid ${({ $active }) => $active ? 'black': 'transparent'};
    font-size: 0.8em;
    cursor: pointer;

    ${({ $disabled = false }) => $disabled && css`
        opacity: 0.5;
        cursor: not-allowed;
    `}
`
const Body = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 12,
    $grow: 1,
    $shrink: 1,
    ...props,
}))`
    height: 100%;
    padding: 24px;
    overflow: auto;
`
const WrapEthText = styled(Text).attrs(props => ({
    $textAlign: 'right',
    $color: 'rgba(0,0,0,0.5)',
    $fontSize: '0.67em',
    ...props,
}))`
    width: 100%;
    margin-top: 8px;
    cursor: pointer;
`

const Footer = styled(CenteredFlex)`
    width: 100%;
    padding: 24px;
    border-top: ${({ theme }) => theme.border.thin};
`

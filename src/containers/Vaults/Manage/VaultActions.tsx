import { useEffect, useMemo, useState } from 'react'

import { ActionState, VaultAction, formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useVault } from '~/providers/VaultProvider'
import { formatCollateralLabel } from '~/utils'
import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { NumberInput } from '~/components/NumberInput'
import { WrapETHModal } from '~/components/Modal/WrapETHModal'
import { VaultActionError } from './VaultActionError'
import { CheckBox } from '~/components/CheckBox'
import { VaultTxModal } from '~/components/Modal/VaultTxModal'

export function VaultActions() {
    const { vaultModel: vaultState } = useStoreState((state) => state)
    const {
        vaultModel: vaultActions,
        popupsModel: { toggleModal },
    } = useStoreActions((actions) => actions)

    const { vault, action, setAction, formState, updateForm, collateral, debt, summary, error } = useVault()

    const isWithdraw = action === VaultAction.WITHDRAW_REPAY || action === VaultAction.WITHDRAW_BORROW
    const isRepay = action === VaultAction.WITHDRAW_REPAY || action === VaultAction.DEPOSIT_REPAY

    const [reviewActive, setReviewActive] = useState(false)
    const [wrapEthActive, setWrapEthActive] = useState(false)
    useEffect(() => {
        toggleModal({
            modal: 'reviewTx',
            isOpen: reviewActive,
        })
    }, [reviewActive, toggleModal])
    useEffect(() => {
        toggleModal({
            modal: 'wrapETH',
            isOpen: wrapEthActive,
        })
    }, [wrapEthActive, toggleModal])

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

    const maxRepay = Number(debt.balance.raw) < Number(debt.total.current?.raw || 0) ? debt.balance : debt.total.current

    return (
        <>
            {reviewActive && (
                <VaultTxModal
                    onClose={() => {
                        setReviewActive(false)
                        vaultActions.setTransactionState(ActionState.NONE)
                    }}
                />
            )}
            <Container>
                <Header>
                    <Flex $width="100%" $justify="space-between" $align="center">
                        <Text $fontWeight={700}>
                            {action === VaultAction.CREATE ? 'Open New Vault' : `Manage Vault #${vault?.id}`}
                        </Text>
                        {Object.values(formState).some((value) => Number(value || '0') > 0) && (
                            <Text
                                $color="rgba(0,0,0,0.5)"
                                $fontSize="0.8em"
                                $textDecoration="underline"
                                onClick={() => updateForm('clear')}
                                style={{ cursor: 'pointer' }}
                            >
                                Clear All
                            </Text>
                        )}
                    </Flex>
                </Header>
                <Body>
                    <NumberInput
                        label={
                            <CenteredFlex $gap={8}>
                                <CheckBox checked={!isWithdraw} size={14} />
                                <Text>Deposit</Text>
                            </CenteredFlex>
                        }
                        subLabel={`Max ${collateral.balance.formatted} ${formatCollateralLabel(collateral.name)}`}
                        placeholder="Deposit Amount"
                        unitLabel={formatCollateralLabel(collateral.name)}
                        onChange={(value: string) => updateForm({ deposit: value || undefined })}
                        value={formState.deposit}
                        onMax={() => updateForm({ deposit: collateral.balance.raw })}
                        conversion={
                            formState.deposit && Number(formState.deposit) > 0
                                ? `~${formatNumberWithStyle(
                                      parseFloat(collateral.priceInUSD || '0') * parseFloat(formState.deposit),
                                      { style: 'currency' }
                                  )}`
                                : ''
                        }
                        onFocus={
                            action === VaultAction.CREATE
                                ? undefined
                                : () =>
                                      setAction((a) => {
                                          switch (a) {
                                              case VaultAction.WITHDRAW_BORROW:
                                                  return VaultAction.DEPOSIT_BORROW
                                              case VaultAction.WITHDRAW_REPAY:
                                                  return VaultAction.DEPOSIT_REPAY
                                              // case VaultAction.DEPOSIT_BORROW:
                                              // case VaultAction.DEPOSIT_REPAY:
                                              // case VaultAction.CREATE:
                                              default:
                                                  return a
                                          }
                                      })
                        }
                        style={!isWithdraw ? undefined : { opacity: 0.4 }}
                    />
                    <NumberInput
                        label={
                            <CenteredFlex $gap={8}>
                                <CheckBox checked={isWithdraw} size={14} />
                                <Text>Withdraw</Text>
                            </CenteredFlex>
                        }
                        subLabel={`Max ${summary.availableCollateral?.formatted || '0'} ${formatCollateralLabel(
                            collateral.name
                        )}`}
                        placeholder="Withdraw Amount"
                        unitLabel={formatCollateralLabel(collateral.name)}
                        onChange={(value: string) => updateForm({ withdraw: value || undefined })}
                        value={formState.withdraw}
                        disabled={action === VaultAction.CREATE}
                        onMax={() => updateForm({ withdraw: summary.availableCollateral?.raw || '0' })}
                        conversion={
                            formState.withdraw && Number(formState.withdraw) > 0
                                ? `~${formatNumberWithStyle(
                                      parseFloat(collateral.priceInUSD || '0') * parseFloat(formState.withdraw),
                                      { style: 'currency' }
                                  )}`
                                : ''
                        }
                        onFocus={
                            action === VaultAction.CREATE
                                ? undefined
                                : () =>
                                      setAction((a) => {
                                          switch (a) {
                                              case VaultAction.DEPOSIT_BORROW:
                                                  return VaultAction.WITHDRAW_BORROW
                                              case VaultAction.DEPOSIT_REPAY:
                                                  return VaultAction.WITHDRAW_REPAY
                                              // case VaultAction.WITHDRAW_BORROW:
                                              // case VaultAction.WITHDRAW_REPAY:
                                              // case VaultAction.CREATE:
                                              default:
                                                  return a
                                          }
                                      })
                        }
                        style={isWithdraw ? undefined : { opacity: 0.4 }}
                        hidden={action === VaultAction.CREATE}
                    />
                    <NumberInput
                        label={
                            <CenteredFlex $gap={8}>
                                <CheckBox checked={!isRepay} size={14} />
                                <Text>Borrow</Text>
                            </CenteredFlex>
                        }
                        subLabel={`Max ${debt.available.formatted} HAI`}
                        placeholder="Borrow Amount"
                        unitLabel="HAI"
                        onChange={(value: string) => updateForm({ borrow: value || undefined })}
                        value={formState.borrow}
                        onMax={() => updateForm({ borrow: debt.available.raw })}
                        conversion={
                            formState.borrow && Number(formState.borrow) > 0
                                ? `~${formatNumberWithStyle(
                                      parseFloat(debt.priceInUSD) * parseFloat(formState.borrow),
                                      { style: 'currency' }
                                  )}`
                                : ''
                        }
                        onFocus={
                            action === VaultAction.CREATE
                                ? undefined
                                : () =>
                                      setAction((a) => {
                                          switch (a) {
                                              case VaultAction.DEPOSIT_REPAY:
                                                  return VaultAction.DEPOSIT_BORROW
                                              case VaultAction.WITHDRAW_REPAY:
                                                  return VaultAction.WITHDRAW_BORROW
                                              // case VaultAction.DEPOSIT_BORROW:
                                              // case VaultAction.WITHDRAW_BORROW:
                                              // case VaultAction.CREATE:
                                              default:
                                                  return a
                                          }
                                      })
                        }
                        style={!isRepay ? undefined : { opacity: 0.4 }}
                    />
                    <NumberInput
                        label={
                            <CenteredFlex $gap={8}>
                                <CheckBox checked={isRepay} size={14} />
                                <Text>Pay Back</Text>
                            </CenteredFlex>
                        }
                        subLabel={`Max ${maxRepay?.formatted || '0'} HAI`}
                        placeholder="Pay Back Amount"
                        unitLabel="HAI"
                        onChange={(value: string) => updateForm({ repay: value || undefined })}
                        value={formState.repay}
                        disabled={action === VaultAction.CREATE}
                        onMax={() => updateForm({ repay: maxRepay?.raw || '0' })}
                        conversion={
                            formState.repay && Number(formState.repay) > 0
                                ? `~${formatNumberWithStyle(parseFloat(debt.priceInUSD) * parseFloat(formState.repay), {
                                      style: 'currency',
                                  })}`
                                : ''
                        }
                        onFocus={
                            action === VaultAction.CREATE
                                ? undefined
                                : () =>
                                      setAction((a) => {
                                          switch (a) {
                                              case VaultAction.DEPOSIT_BORROW:
                                                  return VaultAction.DEPOSIT_REPAY
                                              case VaultAction.WITHDRAW_BORROW:
                                                  return VaultAction.WITHDRAW_REPAY
                                              // case VaultAction.DEPOSIT_REPAY:
                                              // case VaultAction.WITHDRAW_REPAY:
                                              // case VaultAction.CREATE:
                                              default:
                                                  return a
                                          }
                                      })
                        }
                        style={isRepay ? undefined : { opacity: 0.4 }}
                        hidden={action === VaultAction.CREATE}
                    />
                    {collateral.name === 'WETH' && !isWithdraw && (
                        <>
                            <WrapEthText onClick={() => setWrapEthActive(true)}>
                                Need WETH?&nbsp;
                                <Text as="span" $fontWeight={700} $textDecoration="underline">
                                    Click here to wrap
                                </Text>
                            </WrapEthText>
                            {wrapEthActive && <WrapETHModal onClose={() => setWrapEthActive(false)} />}
                        </>
                    )}
                </Body>
                <Footer>
                    <VaultActionError />
                    <HaiButton
                        $variant="yellowish"
                        $width="100%"
                        $justify="center"
                        disabled={!buttonActive || vaultState.transactionState === ActionState.LOADING}
                        onClick={() => setReviewActive(true)}
                    >
                        Review {buttonLabel}
                    </HaiButton>
                </Footer>
            </Container>
        </>
    )
}

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
const WrapEthText = styled(Text).attrs((props) => ({
    $textAlign: 'right',
    $color: 'rgba(0,0,0,0.5)',
    $fontSize: '0.67em',
    ...props,
}))`
    width: 100%;
    margin-top: 8px;
    cursor: pointer;
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

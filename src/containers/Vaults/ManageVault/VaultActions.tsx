import { useMemo } from 'react'

import { VaultAction, VaultInfoError, formatNumberWithStyle } from '~/utils'
import { useVault } from '~/providers/VaultProvider'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { ActionInput } from './ActionInput'

export function VaultActions() {
    const {
        vault,
        action,
        setAction,
        formState,
        updateForm,
        collateral,
        debt,
        error
    } = useVault()

    const [buttonActive, buttonLabel] = useMemo(() => {
        switch(action) {
            case VaultAction.DEPOSIT_BORROW:
            case VaultAction.CREATE: {
                const { deposit = '0', borrow = '0' } = formState
                if (Number(deposit) <= 0 && Number(borrow) <= 0) {
                    return [false, 'Deposit']
                }
                if (Number(borrow) <= 0) return [true, 'Deposit']
                if (Number(deposit) <= 0) return [true, 'Borrow']
                return [true, 'Deposit & Borrow']
            }
            case VaultAction.WITHDRAW_REPAY: {
                const { withdraw = '0', repay = '0' } = formState
                if (Number(withdraw) <= 0 && Number(repay) <= 0) {
                    return [false, 'Withdraw']
                }
                if (Number(repay) <= 0) return [true, 'Withdraw']
                if (Number(withdraw) <= 0) return [true, 'Pay Back']
                return [true, 'Withdraw & Pay Back']
            }
            default: return [false, 'Deposit']
        }
    }, [action, formState])

    return (
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
                <ActionInput
                    label="Deposit"
                    subLabel={`Max ${formatNumberWithStyle(collateral.balance, { maxDecimals: 4 })} ${collateral.name}`}
                    placeholder="Deposit Amount"
                    unitLabel={collateral.name}
                    onChange={(value: string) => updateForm({ deposit: value || undefined })}
                    value={formState.deposit}
                    hidden={action !== VaultAction.DEPOSIT_BORROW && action !== VaultAction.CREATE}
                    onMax={() => updateForm({ deposit: collateral.balance })}
                    footerLabel={formState.deposit && Number(formState.deposit) > 0
                        ? `~${formatNumberWithStyle(
                            parseFloat(collateral.priceInUSD || '0') * parseFloat(formState.deposit),
                            { style: 'currency' }
                        )}`
                        : undefined
                    }
                />
                <ActionInput
                    label="Withdraw"
                    subLabel={`Max ${collateral.available} ${collateral.name}`}
                    placeholder="Withdraw Amount"
                    unitLabel={collateral.name}
                    onChange={(value: string) => updateForm({ withdraw: value || undefined })}
                    value={formState.withdraw}
                    hidden={action !== VaultAction.WITHDRAW_REPAY}
                    onMax={() => updateForm({ withdraw: collateral.available })}
                    footerLabel={formState.withdraw && Number(formState.withdraw) > 0
                        ? `~${formatNumberWithStyle(
                            parseFloat(collateral.priceInUSD || '0') * parseFloat(formState.withdraw),
                            { style: 'currency' }
                        )}`
                        : undefined
                    }
                />
                <ActionInput
                    label="Borrow"
                    subLabel={`Max ${formatNumberWithStyle(debt.available, { maxDecimals: 4 })} HAI`}
                    placeholder="Borrow Amount"
                    unitLabel="HAI"
                    onChange={(value: string) => updateForm({ borrow: value || undefined })}
                    value={formState.borrow}
                    hidden={action !== VaultAction.DEPOSIT_BORROW && action !== VaultAction.CREATE}
                    onMax={() => updateForm({ borrow: debt.available })}
                    footerLabel={formState.borrow && Number(formState.borrow) > 0
                        ? `~${formatNumberWithStyle(
                            parseFloat(debt.priceInUSD) * parseFloat(formState.borrow),
                            { style: 'currency' }
                        )}`
                        : undefined
                    }
                />
                <ActionInput
                    label="Pay Back"
                    subLabel={`Max ${formatNumberWithStyle(debt.available, { maxDecimals: 4 })} HAI`}
                    placeholder="Pay Back Amount"
                    unitLabel="HAI"
                    onChange={(value: string) => updateForm({ repay: value || undefined })}
                    value={formState.repay}
                    hidden={action !== VaultAction.WITHDRAW_REPAY}
                    onMax={() => updateForm({ repay: debt.available })}
                    footerLabel={formState.repay && Number(formState.repay) > 0
                        ? `~${formatNumberWithStyle(
                            parseFloat(debt.priceInUSD) * parseFloat(formState.repay),
                            { style: 'currency' }
                        )}`
                        : undefined
                    }
                />
                <VaultActionError/>
            </Body>
            <Footer>
                <HaiButton
                    $variant="yellowish"
                    $width="100%"
                    $justify="center"
                    disabled={!!error || !buttonActive}>
                    {buttonLabel}
                </HaiButton>
            </Footer>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $column: true,
    $shrink: 0,
    ...props
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
    ...props
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
    ...props
}))`
    height: 100%;
    padding: 24px;
    overflow: auto;
`
const Footer = styled(CenteredFlex)`
    width: 100%;
    padding: 24px;
    border-top: ${({ theme }) => theme.border.thin};
`

function VaultActionError() {
    const { action, formState, error, errorMessage } = useVault()

    if (!error) return null

    if (error === VaultInfoError.ZERO_AMOUNT) {
        if (action === VaultAction.CREATE) {
            // ignore error on initial form state
            if (!formState.deposit || !formState.borrow) return null
        }
        else if (action === VaultAction.DEPOSIT_BORROW) {
            // ignore single-sided empty error
            if (!formState.deposit || !formState.borrow) return null
        }
        else if (action === VaultAction.WITHDRAW_REPAY) {
            // ignore single-sided empty error
            if (!formState.withdraw || !formState.repay) return null
        }
    }

    return (
        <Text
            $fontSize="0.8em"
            $color="red"
            style={{ marginTop: '24px' }}>
            Error: {errorMessage}
        </Text>
    )
}

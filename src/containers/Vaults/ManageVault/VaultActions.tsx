import { useMemo } from 'react'

import { formatNumberWithStyle } from '~/utils'
import { useVault } from '~/providers/VaultProvider'
import { VaultAction, VaultInfoError } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { ActionInput } from './ActionInput'

export type FormState = {
    deposit?: string,
    borrow?: string,
    withdraw?: string,
    payback?: string
}

export function VaultActions() {
    const {
        vault,
        action,
        setAction,
        formState,
        updateForm,
        error,
        errorMessage,
        balances,
        collateralName,
        collateralUSD,
        availableCollateral,
        availableHai,
        haiUSD
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
                const { withdraw = '0', payback = '0' } = formState
                if (Number(withdraw) <= 0 && Number(payback) <= 0) {
                    return [false, 'Withdraw']
                }
                if (Number(payback) <= 0) return [true, 'Withdraw']
                if (Number(withdraw) <= 0) return [true, 'Pay Back']
                return [true, 'Withdraw & Pay Back']
            }
            default: return [false, 'Deposit']
        }
    }, [action, formState])

    const collateralBalanceFormatted = useMemo(() => {
        if (!collateralName) return '0'
        const balance = balances[collateralName]?.toString() || '0'

        return formatNumberWithStyle(balance, { maxDecimals: 4 })
    }, [balances, collateralName])

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
                    subLabel={`Max ${collateralBalanceFormatted} ${collateralName}`}
                    placeholder="Deposit Amount"
                    unitLabel={collateralName}
                    onChange={(value: string) => updateForm({
                        deposit: value || undefined
                    })}
                    value={formState.deposit}
                    hidden={action !== VaultAction.DEPOSIT_BORROW && action !== VaultAction.CREATE}
                    onMax={() => updateForm({ deposit: collateralBalanceFormatted.toString() })}
                    footerLabel={formState.deposit && Number(formState.deposit) > 0
                        ? `~${formatNumberWithStyle(
                            (collateralUSD || 0) * parseFloat(formState.deposit),
                            { style: 'currency' }
                        )}`
                        : undefined
                    }
                />
                <ActionInput
                    label="Withdraw"
                    subLabel={`Max ${availableCollateral.toString()} ${collateralName}`}
                    placeholder="Withdraw Amount"
                    unitLabel={collateralName}
                    onChange={(value: string) => updateForm({
                        withdraw: value || undefined
                    })}
                    value={formState.withdraw}
                    hidden={action !== VaultAction.WITHDRAW_REPAY}
                    onMax={() => updateForm({ withdraw: availableCollateral.toString() })}
                    footerLabel={formState.withdraw && Number(formState.withdraw) > 0
                        ? `~${formatNumberWithStyle(
                            (collateralUSD || 0) * parseFloat(formState.withdraw),
                            { style: 'currency' }
                        )}`
                        : undefined
                    }
                />
                <ActionInput
                    label="Borrow"
                    subLabel={`Max ${formatNumberWithStyle(availableHai.toString(), { maxDecimals: 4 })} HAI`}
                    placeholder="Borrow Amount"
                    unitLabel="HAI"
                    onChange={(value: string) => updateForm({
                        borrow: value || undefined
                    })}
                    value={formState.borrow}
                    hidden={action !== VaultAction.DEPOSIT_BORROW && action !== VaultAction.CREATE}
                    onMax={() => updateForm({ borrow: availableHai.toString() })}
                    footerLabel={formState.borrow && Number(formState.borrow) > 0
                        ? `~${formatNumberWithStyle(haiUSD * parseFloat(formState.borrow), {
                            style: 'currency'
                        })}`
                        : undefined
                    }
                />
                <ActionInput
                    label="Pay Back"
                    subLabel={`Max ${formatNumberWithStyle(availableHai.toString(), { maxDecimals: 4 })} HAI`}
                    placeholder="Pay Back Amount"
                    unitLabel="HAI"
                    onChange={(value: string) => updateForm({
                        payback: value || undefined
                    })}
                    value={formState.payback}
                    hidden={action !== VaultAction.WITHDRAW_REPAY}
                    onMax={() => updateForm({ payback: availableHai.toString() })}
                    footerLabel={formState.payback && Number(formState.payback) > 0
                        ? `~${formatNumberWithStyle(haiUSD * parseFloat(formState.payback), {
                            style: 'currency'
                        })}`
                        : undefined
                    }
                />
                <VaultActionError
                    action={action}
                    formState={formState}
                    error={error}
                    errorMessage={errorMessage}
                />
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

type VaultActionErrorProps = {
    action: VaultAction,
    formState: FormState,
    error?: VaultInfoError,
    errorMessage?: string
}
function VaultActionError({ action, formState, error, errorMessage }: VaultActionErrorProps) {
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
            if (!formState.withdraw || !formState.payback) return null
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

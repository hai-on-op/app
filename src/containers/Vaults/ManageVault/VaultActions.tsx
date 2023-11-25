import { useMemo, type Dispatch } from 'react'
import { BigNumber } from 'ethers'
import { parseEther } from 'ethers/lib/utils'

import { type ISafe } from '~/utils'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { ActionInput } from './ActionInput'

export enum Action {
    DEPOSIT_OR_BORROW,
    WITHDRAW_OR_PAY_BACK
}

export type FormState = {
    deposit?: BigNumber,
    borrow?: BigNumber,
    withdraw?: BigNumber,
    payback?: BigNumber
}

type VaultActionsProps = {
    vault: ISafe,
    actionState: Action,
    setActionState: (state: Action) => void,
    formState: FormState,
    updateForm: Dispatch<Partial<FormState>>
}
export function VaultActions({
    vault,
    actionState,
    setActionState,
    formState,
    updateForm
}: VaultActionsProps) {
    const [buttonActive, buttonLabel] = useMemo(() => {
        switch(actionState) {
            case Action.DEPOSIT_OR_BORROW: {
                if (!formState.deposit?.gt(0) && !formState.borrow?.gt(0)) {
                    return [false, 'Deposit']
                }
                if (!formState.borrow?.gt(0)) return [true, 'Deposit']
                if (!formState.deposit?.gt(0)) return [true, 'Borrow']
                return [true, 'Deposit & Borrow']
            }
            case Action.WITHDRAW_OR_PAY_BACK: {
                if (!formState.withdraw?.gt(0) && !formState.payback?.gt(0)) {
                    return [false, 'Deposit']
                }
                if (!formState.payback?.gt(0)) return [true, 'Withdraw']
                if (!formState.withdraw?.gt(0)) return [true, 'Pay Back']
                return [true, 'Withdraw & Pay Back']
            }
        }
    }, [actionState, formState])

    const isNewVault = !(vault.collateral && vault.debt)

    return (
        <Container>
            <Header>
                <Text $fontWeight={700}>
                    {isNewVault
                        ? 'Open New Vault'
                        : `Manage Vault #${vault.id}`
                    }
                </Text>
                <Grid $columns="1fr 1fr">
                    <HeaderNav
                        $active={actionState === Action.DEPOSIT_OR_BORROW}
                        onClick={() => setActionState(Action.DEPOSIT_OR_BORROW)}>
                        Deposit & Borrow
                    </HeaderNav>
                    <HeaderNav
                        $disabled={isNewVault}
                        $active={actionState === Action.WITHDRAW_OR_PAY_BACK}
                        onClick={!isNewVault
                            ? () => setActionState(Action.WITHDRAW_OR_PAY_BACK)
                            : () => setActionState(Action.DEPOSIT_OR_BORROW)
                        }>
                        Withdraw & Pay Back
                    </HeaderNav>
                </Grid>
            </Header>
            <Body>
                <ActionInput
                    label="Deposit"
                    subLabel={`Max ${23} ${vault?.collateralName}`}
                    placeholder="Deposit Amount"
                    unitLabel={vault?.collateralName}
                    onChange={(value: string) => updateForm({
                        deposit: value ? parseEther(value): undefined
                    })}
                    value={formState.deposit}
                    hidden={actionState !== Action.DEPOSIT_OR_BORROW}
                />
                <ActionInput
                    label="Withdraw"
                    subLabel={`Max ${23} ${vault?.collateralName}`}
                    placeholder="Withdraw Amount"
                    unitLabel={vault?.collateralName}
                    onChange={(value: string) => updateForm({
                        withdraw: value ? parseEther(value): undefined
                    })}
                    value={formState.withdraw}
                    hidden={actionState !== Action.WITHDRAW_OR_PAY_BACK}
                />
                <ActionInput
                    label="Borrow"
                    subLabel={`Max ${23} HAI`}
                    placeholder="Borrow Amount"
                    unitLabel="HAI"
                    onChange={(value: string) => updateForm({
                        borrow: value ? parseEther(value): undefined
                    })}
                    value={formState.borrow}
                    hidden={actionState !== Action.DEPOSIT_OR_BORROW}
                />
                <ActionInput
                    label="Pay Back"
                    subLabel={`Max ${23} HAI`}
                    placeholder="Pay Back Amount"
                    unitLabel="HAI"
                    onChange={(value: string) => updateForm({
                        payback: value ? parseEther(value): undefined
                    })}
                    value={formState.payback}
                    hidden={actionState !== Action.WITHDRAW_OR_PAY_BACK}
                />
            </Body>
            <Footer>
                <HaiButton
                    $variant="yellowish"
                    $width="100%"
                    disabled={!buttonActive}>
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
}))`
    padding-top: 24px;
    border-bottom: 1px solid rgba(0,0,0,0.3);

    & > *:first-child {
        padding-left: 24px;
    }
`
const HeaderNav = styled(CenteredFlex)<{ $active?: boolean, $disabled?: boolean }>`
    padding: 12px;
    border-bottom: 2px solid ${({ $active }) => $active ? 'black': 'transparent'};
    font-size: 0.8em;
    cursor: pointer;

    ${({ $disabled = false }) => $disabled && css`
        opacity: 0.7;
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
    border-top: 1px solid rgba(0,0,0,0.3);
`

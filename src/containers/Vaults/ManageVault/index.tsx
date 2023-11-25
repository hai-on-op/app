import { useMemo, useReducer, useState } from 'react'
import { BigNumber } from 'ethers'

import type { ReactChildren } from '~/types'
import { type ISafe } from '~/utils'

import styled from 'styled-components'
import { BlurContainer, CenteredFlex, Flex, Text } from '~/styles'
import { BrandedDropdown } from '~/components/BrandedDropdown'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { Overview } from './Overview'
import { Action, type FormState, VaultActions } from './VaultActions'

type ManageVaultProps = {
    vault: ISafe,
    headerContent?: ReactChildren
}
export function ManageVault({ vault, headerContent }: ManageVaultProps) {
    const [actionState, setActionState] = useState(Action.DEPOSIT_OR_BORROW)

    const [formState, updateForm] = useReducer((
        previous: FormState,
        update: Partial<FormState>
    ): FormState => {
        return {
            ...previous,
            ...update
        }
    }, {
        deposit: undefined,
        borrow: undefined,
        withdraw: undefined,
        payback: undefined
    })

    const simulation = useMemo(() => {
        if (!Object.values(formState).some(value => !!value?.gt(0))) return undefined

        if (actionState === Action.DEPOSIT_OR_BORROW) {
            if (!formState.deposit?.gt(0) && !formState.borrow?.gt(0)) return undefined
            return {
                collateral: formState.deposit?.gt(0)
                    ? BigNumber.from(vault.collateral).add(formState.deposit).toString()
                    : undefined,
                debt: formState.borrow?.gt(0)
                    ? BigNumber.from(vault.debt).add(formState.borrow).toString()
                    : undefined
            }
        }
        if (!formState.withdraw?.gt(0) && !formState.payback?.gt(0)) return undefined
        return {
            collateral: formState.withdraw?.gt(0)
                ? BigNumber.from(vault.collateral).sub(formState.withdraw).toString()
                : undefined,
            debt: formState.payback?.gt(0)
                ? BigNumber.from(vault.debt).sub(formState.payback).toString()
                : undefined
        }
    }, [vault, actionState, formState])

    return (
        <Container>
            <Header>
                <CenteredFlex $gap={12}>
                    <BrandedDropdown
                        label={(<>
                            <TokenPair tokens={[vault.collateralName as any, 'HAI']}/>
                            <Text>{`• 1 of `}12</Text>
                        </>)}>
                        <Text>blarn</Text>
                        <Text>blarn</Text>
                        <Text>blarn</Text>
                    </BrandedDropdown>
                    <RewardsTokenPair tokens={['OP']}/>
                </CenteredFlex>
                <Text>
                    Market Price:&nbsp;
                    <strong>1,874 HAI/WETH</strong>
                </Text>
                {headerContent}
            </Header>
            <Body>
                <Overview
                    vault={vault}
                    simulation={simulation}
                />
                <VaultActions
                    vault={vault}
                    actionState={actionState}
                    setActionState={setActionState}
                    formState={formState}
                    updateForm={updateForm}
                />
            </Body>
        </Container>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
`

const Header = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props
}))`
    position: relative;
    padding: 24px 48px;
    border-bottom: ${({ theme }) => theme.border.medium};
    z-index: 1;
`

const Body = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'flex-start',
    $gap: 48,
    ...props
}))`
    padding: 48px;
`

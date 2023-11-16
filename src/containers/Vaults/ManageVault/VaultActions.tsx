import { type ChangeEvent } from 'react'

import { type ISafe } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { Tooltip } from '~/components/Tooltip'

type VaultActionsProps = {
    vault?: ISafe
}
export function VaultActions({ vault }: VaultActionsProps) {
    return (
        <Container>
            <Header>
                <Text $fontWeight={700}>
                    {!vault ? 'Open New Vault': `Manage Vault #${vault.id}`}
                </Text>
            </Header>
            <Body>
                <ActionInput
                    label="Deposit"
                    tooltip="blarn"
                    subLabel={`Max ${23} WETH`}
                    value={''}
                    placeholder="Enter Deposit Amount"
                    onChange={(value: string) => value}
                />
                <ActionInput
                    label="Withdraw"
                    tooltip="blarn"
                    subLabel={`Max ${23} WETH`}
                    value={''}
                    placeholder="Enter Withdraw Amount"
                    onChange={(value: string) => value}
                />
                <ActionInput
                    label="Borrow"
                    tooltip="blarn"
                    subLabel={`Max ${23} WETH`}
                    value={''}
                    placeholder="Enter Borrow Amount"
                    onChange={(value: string) => value}
                />
                <ActionInput
                    label="Pay Back"
                    tooltip="blarn"
                    subLabel={`Max ${23} WETH`}
                    value={''}
                    placeholder="Enter Pay Back Amount"
                    onChange={(value: string) => value}
                />
            </Body>
            <Footer>
                <HaiButton
                    $variant="yellowish"
                    $width="100%">
                    Deposit & Pay Back (2)
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
const Header = styled(Flex)`
    width: 100%;
    padding: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(0,0,0,0.3);
`
const Body = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    $gap: 24,
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

type ActionInputProps = {
    label: string,
    tooltip: string,
    subLabel: string,
    value: string,
    placeholder: string,
    onChange: (value: string) => void
}
function ActionInput({
    label,
    tooltip,
    subLabel,
    value,
    placeholder,
    onChange
}: ActionInputProps) {
    return (
        <Flex
            $width="100%"
            $column
            $gap={12}>
            <Flex
                $width="100%"
                $justify="space-between"
                $align="center">
                <CenteredFlex $gap={8}>
                    <Tooltip>{tooltip}</Tooltip>
                    <Text
                        $fontSize="0.65em"
                        $fontWeight={700}>
                        {label}
                    </Text>
                </CenteredFlex>
                <Text $fontSize="0.65em">{subLabel}</Text>
            </Flex>
            <Input
                type="number"
                value={value}
                placeholder={placeholder}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.currentTarget.value)}
            />
        </Flex>
    )
}

const Input = styled.input`
    width: 100%;
    height: 56px;
    padding: 0 12px;
    border-radius: 8px;
    outline: none;
    border: ${({ theme }) => theme.border.medium};
    background: transparent;
`

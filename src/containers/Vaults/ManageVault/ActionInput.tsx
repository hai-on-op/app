import { type ChangeEvent, useRef } from 'react'
import { BigNumber } from 'ethers'

import { formatDataNumber } from '~/utils'

import styled, { css } from 'styled-components'
import { Flex, Text } from '~/styles'

type ActionInputProps = {
    label: string,
    subLabel: string,
    placeholder: string,
    unitLabel?: string,
    value?: BigNumber,
    onChange: (value: string) => void,
    hidden?: boolean
}
export function ActionInput({
    label,
    subLabel,
    placeholder,
    unitLabel,
    value,
    onChange,
    hidden = false
}: ActionInputProps) {
    const input = useRef<HTMLInputElement | null>(null)

    return (
        <Container hidden={hidden}>
            <Flex
                $width="100%"
                $justify="space-between"
                $align="center">
                <Text
                    $fontSize="0.65em"
                    $fontWeight={700}>
                    {label}
                </Text>
                <Text $fontSize="0.65em">{subLabel}</Text>
            </Flex>
            <InputContainer onClick={() => input.current?.click()}>
                <Input
                    ref={input}
                    type="number"
                    defaultValue={''}
                    placeholder={placeholder}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.currentTarget.value)}
                />
                {unitLabel && <InputLabel>{unitLabel}</InputLabel>}
                <FooterText>
                    {value ? `~${formatDataNumber(value.toString(), 18, 3, true, true)}`: ''}
                </FooterText>
            </InputContainer>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $gap: 12,
    ...props
}))<{ hidden: boolean }>`
    ${({ hidden }) => hidden && css`display: none;`}
`

const InputContainer = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    ...props
}))`
    border: ${({ theme }) => theme.border.medium};
    border-radius: 8px;
`
const Input = styled.input`
    width: 172px;
    height: 56px;
    padding-left: 24px;
    padding-right: 12px;
    outline: none;
    border: none;
    background: transparent;
`
const InputLabel = styled(Text).attrs(props => ({
    $fontSize: '0.8em',
    $fontWeight: 700,
    ...props
}))`
    min-width: 48px;
    z-index: 1;
`

const FooterText = styled(Text).attrs(props => ({
    $fontSize: '0.67rem',
    $color: 'rgba(0,0,0,0.3)',
    $textAlign: 'left',
    ...props
}))``

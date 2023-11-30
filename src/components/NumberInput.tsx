import { type ChangeEvent, useRef } from 'react'

import styled, { css } from 'styled-components'
import { Flex, type FlexProps, Text } from '~/styles'

type NumberInputProps = FlexProps & {
    label: string,
    subLabel: string,
    placeholder: string,
    unitLabel?: string,
    value?: string,
    conversion?: string,
    onChange: (value: string) => void,
    onMax?: () => void,
    hidden?: boolean
}
export function NumberInput({
    label,
    subLabel,
    placeholder,
    unitLabel,
    value,
    conversion,
    onChange,
    onMax,
    hidden = false,
    ...props
}: NumberInputProps) {
    const input = useRef<HTMLInputElement | null>(null)

    return (
        <Container
            $gap={12}
            {...props}
            hidden={hidden}>
            <Flex
                $width="100%"
                $justify="space-between"
                $align="center">
                <Text
                    $fontSize="0.65em"
                    $fontWeight={700}>
                    {label}
                </Text>
                <Text
                    $fontSize="0.65em"
                    onClick={onMax}
                    style={onMax ? { cursor: 'pointer' }: undefined}>
                    {subLabel}
                </Text>
            </Flex>
            <InputContainer onClick={() => input.current?.click()}>
                <Input
                    ref={input}
                    type="number"
                    value={value || ''}
                    placeholder={placeholder}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.currentTarget.value)}
                />
                {!!unitLabel && <InputLabel>{unitLabel}</InputLabel>}
                {typeof conversion !== 'undefined' && <ConversionText>{conversion}</ConversionText>}
            </InputContainer>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
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
    padding-right: 4px;
`
const Input = styled.input`
    width: 100%;
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
    flex-shrink: 0;
    z-index: 1;
`

const ConversionText = styled(Text).attrs(props => ({
    $fontSize: '0.67rem',
    $color: 'rgba(0,0,0,0.5)',
    $textAlign: 'left',
    ...props
}))`
    width: 75px;
    flex-shrink: 0;
`

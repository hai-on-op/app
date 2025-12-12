import { useState, useRef, type ReactNode } from 'react'

import { useOutsideClick } from '~/hooks'
import styled, { css } from 'styled-components'
import { Flex, Text } from '~/styles'
import { CaretWithOutline } from './Icons/CaretWithOutline'

export type SelectOption<T = string> = {
    label: string
    value: T
    icon?: ReactNode
}

type SelectInputProps<T = string> = {
    label: JSX.Element | string
    subLabel: string
    options: SelectOption<T>[]
    value: T
    onChange: (value: T) => void
    placeholder?: string
    disabled?: boolean
    hidden?: boolean
    style?: React.CSSProperties
}

export function SelectInput<T = string>({
    label,
    subLabel,
    options,
    value,
    onChange,
    placeholder = 'Select option',
    disabled = false,
    hidden = false,
    style,
}: SelectInputProps<T>) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement | null>(null)

    useOutsideClick(containerRef, () => setIsOpen(false))

    const selectedOption = options.find((option) => option.value === value)

    const handleOptionClick = (optionValue: T) => {
        onChange(optionValue)
        setIsOpen(false)
    }

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen)
        }
    }

    return (
        <Container ref={containerRef} $gap={12} hidden={hidden} style={style}>
            <Flex $width="100%" $justify="space-between" $align="center">
                <Text $fontSize="0.65em" $fontWeight={700}>
                    {label}
                </Text>
                <Text $fontSize="0.65em">{subLabel}</Text>
            </Flex>
            <SelectContainer>
                <SelectButton onClick={handleInputClick} $disabled={disabled} $isOpen={isOpen}>
                    <SelectedContent>
                        {selectedOption?.icon && <IconWrapper>{selectedOption.icon}</IconWrapper>}
                        <Text>{selectedOption?.label || placeholder}</Text>
                    </SelectedContent>
                    <CaretWrapper $isOpen={isOpen}>
                        <CaretWithOutline size={12} />
                    </CaretWrapper>
                </SelectButton>
                {isOpen && (
                    <DropdownContainer>
                        {options.map((option) => (
                            <DropdownOption
                                key={String(option.value)}
                                onClick={() => handleOptionClick(option.value)}
                                $isSelected={option.value === value}
                            >
                                {option.icon && <IconWrapper>{option.icon}</IconWrapper>}
                                <Text>{option.label}</Text>
                            </DropdownOption>
                        ))}
                    </DropdownContainer>
                )}
            </SelectContainer>
        </Container>
    )
}

const Container = styled(Flex).attrs((props) => ({
    $width: '100%',
    $column: true,
    ...props,
}))<{ hidden: boolean }>`
    ${({ hidden }) =>
        hidden &&
        css`
            display: none;
        `}
    position: relative;
`

const SelectContainer = styled.div`
    position: relative;
    width: 100%;
`

const SelectButton = styled.div<{ $disabled: boolean; $isOpen: boolean }>`
    width: 100%;
    height: 46px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 8px;
    padding: 0 4px 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
    background: ${({ theme }) => theme.colors.background};
    transition: all 0.2s ease;

    ${({ $disabled }) =>
        $disabled &&
        css`
            opacity: 0.6;
        `}

    ${({ $isOpen, theme }) =>
        $isOpen &&
        css`
            border-color: ${theme.colors.primary};
            box-shadow: 0 0 0 1px ${theme.colors.primary}40;
        `}
    
    &:hover {
        ${({ $disabled, theme }) =>
            !$disabled &&
            css`
                border-color: ${theme.colors.primary};
            `}
    }
`

const SelectedContent = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
`

const IconWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
`

const CaretWrapper = styled.div<{ $isOpen: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-right: 12px;
    transition: transform 0.2s ease;

    ${({ $isOpen }) =>
        $isOpen &&
        css`
            transform: rotate(180deg);
        `}
`

const DropdownContainer = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1000;
    background: ${({ theme }) => theme.colors.background};
    border: ${({ theme }) => theme.border.medium};
    border-radius: 8px;
    margin-top: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    animation: slideDown 0.2s ease;

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`

const DropdownOption = styled.div<{ $isSelected: boolean }>`
    padding: 12px 24px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s ease;

    ${({ $isSelected, theme }) =>
        $isSelected &&
        css`
            background: ${theme.colors.yellowish}40;
            color: ${theme.colors.primary};
        `}

    &:hover {
        background: ${({ theme, $isSelected }) =>
            $isSelected ? theme.colors.yellowish + '60' : theme.colors.yellowish + '80'};
    }
`

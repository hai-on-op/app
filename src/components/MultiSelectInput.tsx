import { useState, useRef, type ReactNode } from 'react'

import { useOutsideClick } from '~/hooks'
import styled, { css } from 'styled-components'
import { Flex, Text } from '~/styles'
import { CaretWithOutline } from './Icons/CaretWithOutline'

export type MultiSelectOption<T = string> = {
    label: string
    value: T
    icon?: ReactNode
    description?: string
}

type MultiSelectInputProps<T = string> = {
    label: JSX.Element | string
    subLabel: string
    options: MultiSelectOption<T>[]
    selectedValues: T[]
    onChange: (values: T[]) => void
    placeholder?: string
    disabled?: boolean
    hidden?: boolean
    style?: React.CSSProperties
}

export function MultiSelectInput<T = string>({
    label,
    subLabel,
    options,
    selectedValues,
    onChange,
    placeholder = 'Select options',
    disabled = false,
    hidden = false,
    style,
}: MultiSelectInputProps<T>) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement | null>(null)

    useOutsideClick(containerRef, () => setIsOpen(false))

    const handleOptionClick = (optionValue: T) => {
        const newSelectedValues = selectedValues.includes(optionValue)
            ? selectedValues.filter((value) => value !== optionValue)
            : [...selectedValues, optionValue]
        onChange(newSelectedValues)
    }

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen)
        }
    }

    const getDisplayText = () => {
        if (selectedValues.length === 0) return placeholder
        if (selectedValues.length === 1) {
            const option = options.find((opt) => opt.value === selectedValues[0])
            return option?.label || placeholder
        }
        return `${selectedValues.length} items selected`
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
                        <Text>{getDisplayText()}</Text>
                    </SelectedContent>
                    <CaretWrapper $isOpen={isOpen}>
                        <CaretWithOutline size={12} />
                    </CaretWrapper>
                </SelectButton>
                {isOpen && (
                    <DropdownContainer>
                        {options.map((option) => {
                            const isSelected = selectedValues.includes(option.value)
                            return (
                                <DropdownOption
                                    key={String(option.value)}
                                    onClick={() => handleOptionClick(option.value)}
                                    $isSelected={isSelected}
                                >
                                    <Checkbox $isSelected={isSelected}>
                                        {isSelected && <Checkmark>✓</Checkmark>}
                                    </Checkbox>
                                    <OptionContent>
                                        <Text $fontWeight={isSelected ? 600 : 400}>{option.label}</Text>
                                        {option.description && (
                                            <Text $fontSize="0.8em" $color="rgba(0,0,0,0.6)">
                                                {option.description}
                                            </Text>
                                        )}
                                    </OptionContent>
                                </DropdownOption>
                            )
                        })}
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
    max-height: 300px;
    overflow-y: auto;

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
    gap: 12px;
    cursor: pointer;
    transition: all 0.2s ease;

    ${({ $isSelected, theme }) =>
        $isSelected &&
        css`
            background: ${theme.colors.yellowish}40;
        `}

    &:hover {
        background: ${({ theme, $isSelected }) =>
            $isSelected ? theme.colors.yellowish + '60' : theme.colors.yellowish + '80'};
    }
`

const Checkbox = styled.div<{ $isSelected: boolean }>`
    width: 16px;
    height: 16px;
    border: 2px solid ${({ theme, $isSelected }) => ($isSelected ? theme.colors.primary : theme.colors.text)};
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: ${({ $isSelected, theme }) => ($isSelected ? theme.colors.primary : 'transparent')};
    transition: all 0.2s ease;
`

const Checkmark = styled.span`
    color: white;
    font-size: 10px;
    font-weight: bold;
    line-height: 1;
`

const OptionContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
`

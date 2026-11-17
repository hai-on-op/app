import { useState, useRef, useEffect, type KeyboardEvent, type ReactNode } from 'react'

import { useOutsideClick } from '~/hooks/useOutsideClick'
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

let nextSelectId = 0

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
    const [activeIndex, setActiveIndex] = useState(0)
    const [id] = useState(() => `select-input-${++nextSelectId}`)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const buttonRef = useRef<HTMLButtonElement | null>(null)
    const expanded = isOpen && !disabled && !hidden

    useOutsideClick(containerRef, () => setIsOpen(false))

    useEffect(() => {
        if (disabled || hidden) setIsOpen(false)
    }, [disabled, hidden])

    const selectedOption = options.find((option) => option.value === value)

    const handleOptionClick = (optionValue: T) => {
        if (disabled) return
        onChange(optionValue)
        setIsOpen(false)
        buttonRef.current?.focus()
    }

    const handleInputClick = () => {
        if (!disabled) {
            setActiveIndex(
                Math.max(
                    0,
                    options.findIndex((option) => option.value === value)
                )
            )
            setIsOpen(!isOpen)
        }
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return
        const selectedIndex = Math.max(
            0,
            options.findIndex((option) => option.value === value)
        )
        if (event.key === 'Escape' || event.key === 'Tab') {
            if (event.key === 'Escape' && expanded) event.preventDefault()
            setIsOpen(false)
            return
        }
        if (!options.length) return
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex(
                expanded
                    ? Math.max(0, Math.min(options.length - 1, activeIndex + (event.key === 'ArrowDown' ? 1 : -1)))
                    : selectedIndex
            )
            setIsOpen(true)
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault()
            setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
            setIsOpen(true)
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (expanded && options[activeIndex]) handleOptionClick(options[activeIndex].value)
            else {
                setActiveIndex(selectedIndex)
                setIsOpen(true)
            }
        }
    }

    return (
        <Container ref={containerRef} $gap={12} hidden={hidden} style={style}>
            <Flex $width="100%" $justify="space-between" $align="center">
                <Text id={`${id}-label`} $fontSize="0.65em" $fontWeight={700}>
                    {label}
                </Text>
                <Text id={`${id}-hint`} $fontSize="0.65em">
                    {subLabel}
                </Text>
            </Flex>
            <SelectContainer>
                <SelectButton
                    ref={buttonRef}
                    type="button"
                    role="combobox"
                    aria-labelledby={`${id}-label`}
                    aria-describedby={subLabel ? `${id}-hint` : undefined}
                    aria-haspopup="listbox"
                    aria-expanded={expanded}
                    aria-controls={expanded ? `${id}-options` : undefined}
                    aria-activedescendant={expanded && options[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
                    disabled={disabled}
                    onClick={handleInputClick}
                    onKeyDown={handleKeyDown}
                    $disabled={disabled}
                    $isOpen={expanded}
                >
                    <SelectedContent>
                        {selectedOption?.icon && <IconWrapper>{selectedOption.icon}</IconWrapper>}
                        <Text>{selectedOption?.label || placeholder}</Text>
                    </SelectedContent>
                    <CaretWrapper $isOpen={expanded} aria-hidden="true">
                        <CaretWithOutline size={12} />
                    </CaretWrapper>
                </SelectButton>
                {expanded && (
                    <DropdownContainer id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`}>
                        {options.map((option, index) => (
                            <DropdownOption
                                id={`${id}-option-${index}`}
                                role="option"
                                aria-selected={option.value === value}
                                key={String(option.value)}
                                onClick={() => handleOptionClick(option.value)}
                                onMouseEnter={() => setActiveIndex(index)}
                                $isSelected={option.value === value}
                                $isActive={activeIndex === index}
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

const SelectButton = styled.button<{ $disabled: boolean; $isOpen: boolean }>`
    appearance: none;
    color: inherit;
    font: inherit;
    text-align: left;
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

    &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.primary};
        outline-offset: 2px;
    }

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

const DropdownOption = styled.div<{ $isSelected: boolean; $isActive: boolean }>`
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

    ${({ $isActive, $isSelected, theme }) =>
        $isActive &&
        css`
            background: ${$isSelected ? theme.colors.yellowish + '60' : theme.colors.yellowish + '80'};
        `}

    &:hover {
        background: ${({ theme, $isSelected }) =>
            $isSelected ? theme.colors.yellowish + '60' : theme.colors.yellowish + '80'};
    }
`

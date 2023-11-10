import { useState, type ChangeEvent } from 'react'

import { useOutsideClick } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Popout, type TextProps, Title, Flex, Text } from '~/styles'
import Caret from './Icons/Caret'

type BrandedSelectOption = {
    label: string,
    value: string,
    icon?: JSX.Element | string,
    description?: string
}

type BrandedSelectProps = TextProps & {
    width?: string,
    options: BrandedSelectOption[],
    value: string,
    onChange: (value: string) => void
}
export function BrandedSelect({ width, options, value, onChange, ...props }: BrandedSelectProps) {
    const [container, setContainer] = useState<HTMLElement>()
    const [persistent, setPersistent] = useState(false)
    // const [active, setActive] = useState(false)

    useOutsideClick(container, () => setPersistent(false))

    return (
        <Container
            ref={setContainer as any}
            $gap={16}
            // onPointerOver={() => setActive(true)}
            // onPointerLeave={() => setActive(false)}
            onClick={() => setPersistent(p => !p)}>
            <HiddenText
                $fontSize="3.2em"
                $lineHeight="1"
                {...props}>
                {options.find(({ value: v }) => v === value)?.label}
            </HiddenText>
            <Select
                as="select"
                value={value}
                $color="yellowish"
                $fontSize="3.2em"
                $lineHeight="1"
                onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.currentTarget.value)}
                {...props}>
                {options.map(({ label, value: v }) => (
                    <option
                        key={v}
                        value={v}>
                        {label}
                    </option>
                ))}
            </Select>
            <Caret/>
            <Dropdown
                $float="left"
                $margin="30px"
                hidden={!persistent}>
                {options.map(({ label, value: v, icon, description }) => (
                    <DropdownOption
                        key={v}
                        $active={v === value}
                        onClick={() => {
                            // e.stopPropagation()
                            onChange(v)
                        }}>
                        {icon && (
                            <DropdownIcon>
                                {typeof icon === 'string'
                                    ? <img src={icon} alt=""/>
                                    : icon
                                }
                            </DropdownIcon>
                        )}
                        <Flex
                            $column
                            $justify="flex-start"
                            $align="flex-start">
                            <Text $fontWeight={700}>{label}</Text>
                            <Text>{description}</Text>
                        </Flex>
                    </DropdownOption>
                ))}
            </Dropdown>
        </Container>
    )
}

const Container = styled(CenteredFlex)`
    position: relative;
    height: 80px;
    padding: 0 12px;
    border-bottom: 2px solid rgba(0,0,0,0.1);
    cursor: pointer;
    & > svg {
        pointer-events: none;
        transform: rotate(90deg);
    }
`
const HiddenText = styled(Title)`
    visibility: hidden;
`

const Select = styled(Title)`
    position: absolute;
    left: 12px;
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    background-color: transparent;
    outline: none;
    border: none;
    pointer-events: none;
`

const Dropdown = styled(Popout)`
    width: 400px;
    padding: 24px;
    margin-right: -22px;
    gap: 12px;
`
const DropdownOption = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    ...props
}))<{ $active?: boolean }>`
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.1);
    font-size: 0.8em;
    cursor: pointer;

    background-color: ${({ $active = false }) => $active ? 'rgba(0,0,0,0.05)': 'transparent'};

    &:hover {
        background-color: rgba(0,0,0,0.05);
    }
`
const DropdownIcon = styled(CenteredFlex)`
    width: 56px;
    height: 56px;
    border-radius: 50%;
    flex-shrink: 0;
    border: ${({ theme }) => theme.border.medium};
    background-color: ${({ theme }) => theme.colors.greenish};
`
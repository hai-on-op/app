import { useState, type ChangeEvent, useEffect } from 'react'

import { useOutsideClick } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Popout, type TextProps, Title, Flex, Text } from '~/styles'
import { ExternalLink } from './ExternalLink'
import { CaretWithOutline } from './Icons/CaretWithOutline'

type BrandedSelectOption = {
    label: string,
    value: string,
    icon?: JSX.Element | string | (JSX.Element | string)[],
    description?: string,
    href?: string
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
            $gap={8}
            // onPointerOver={() => setActive(true)}
            // onPointerLeave={() => setActive(false)}
            onClick={() => setPersistent(p => !p)}>
            <HiddenText
                $fontSize="3.2em"
                $lineHeight="1"
                {...props}>
                {options.find(({ value: v }) => v === value)?.label.toUpperCase()}
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
                        {label.toUpperCase()}
                    </option>
                ))}
            </Select>
            <CaretWithOutline/>
            <Dropdown
                $float="left"
                $margin="30px"
                hidden={!persistent}>
                {options.map(({ label, value: v, icon, description, href }) => !href
                    ? (
                        <DropdownOption
                            key={v}
                            $active={v === value}
                            onClick={() => {
                                // e.stopPropagation()
                                onChange(v)
                            }}>
                            {icon && (
                                <DropdownIcon icon={icon}/>
                            )}
                            <Flex
                                $column
                                $justify="flex-start"
                                $align="flex-start">
                                <Text $fontWeight={700}>{label}</Text>
                                <Text>{description}</Text>
                            </Flex>
                        </DropdownOption>
                    )
                    : (
                        <ExternalLink
                            key={v}
                            href={href}
                            $textDecoration="none">
                            <DropdownOption
                                $active={v === value}
                                onClick={() => {
                                    // e.stopPropagation()
                                    onChange(v)
                                }}>
                                {icon && (
                                    <DropdownIcon icon={icon}/>
                                )}
                                <Flex
                                    $column
                                    $justify="flex-start"
                                    $align="flex-start">
                                    <Text $fontWeight={700}>{label}</Text>
                                    <Text>{description}</Text>
                                </Flex>
                            </DropdownOption>
                        </ExternalLink>
                    )
                )}
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
        width: 32px;
        height: auto;
        fill: ${({ theme }) => theme.colors.yellowish};
        stroke: black;
        stroke-width: 1px;
        margin-top: 8px;
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
    margin-right: -14px;
    gap: 12px;
    cursor: default;
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
const DropdownIconContainer = styled(CenteredFlex)`
    width: 52px;
    height: 52px;
    border-radius: 50%;
    flex-shrink: 0;
    border: ${({ theme }) => theme.border.medium};
    background-color: ${({ theme }) => theme.colors.greenish};
    overflow: hidden;

    & > img {
        width: 52px;
        height: 52px;
    }
`

function DropdownIcon({ icon }: { icon: BrandedSelectOption['icon'] }) {
    const [currentIcon, setCurrentIcon] = useState(Array.isArray(icon) ? icon[0]: icon)

    useEffect(() => {
        if (!Array.isArray(icon)) return

        let index = 0
        const int = setInterval(() => {
            index++
            setCurrentIcon(icon[index % icon.length])
        }, 3000)

        return () => clearInterval(int)
    }, [icon])

    return (
        <DropdownIconContainer>
            {typeof currentIcon === 'string'
                ? <img src={currentIcon} alt=""/>
                : currentIcon}
        </DropdownIconContainer>
    )
}
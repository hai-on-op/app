import { useState, type ChangeEvent } from 'react'

import type { TokenKey } from '~/types'
import { TOKEN_LOGOS } from '~/utils'
import { useOutsideClick } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Popout, type TextProps, Title, Flex, Text } from '~/styles'
import { CaretWithOutline } from './Icons/CaretWithOutline'
import { Link } from './Link'
import { CyclingTokenArray, TokenArray } from './TokenArray'
import { IconCycler } from './Icons/IconCycler'

export type BrandedSelectOption = {
    label: string
    value: string
    icon?: JSX.Element | TokenKey | 'ALL_COLLATERAL' | 'ALL_TOKENS' | JSX.Element[] | TokenKey[]
    description?: string
    href?: string
}

type BrandedSelectProps = TextProps & {
    width?: string
    options: BrandedSelectOption[]
    value: string
    onChange: (value: string) => void
}
export function BrandedSelect({ width, options, value, onChange, ...props }: BrandedSelectProps) {
    const [container, setContainer] = useState<HTMLElement | null>(null)
    const [persistent, setPersistent] = useState(false)

    useOutsideClick(container, () => setPersistent(false))

    return (
        <Container ref={setContainer} $width={width} $gap={8} onClick={() => setPersistent((p) => !p)}>
            <HiddenText $fontSize="3.2em" $lineHeight="1" {...props}>
                {options.find(({ value: v }) => v === value)?.label.toUpperCase()}
            </HiddenText>
            <Select
                as="select"
                value={value}
                $color="yellowish"
                $fontSize="3.2em"
                $lineHeight="1"
                onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.currentTarget.value)}
                {...props}
            >
                {options.map(({ label, value: v }) => (
                    <option key={v} value={v}>
                        {label.toUpperCase()}
                    </option>
                ))}
            </Select>
            <IconContainer $active={persistent}>
                <CaretWithOutline />
            </IconContainer>
            <Dropdown $float="left" $margin="30px" hidden={!persistent}>
                {options.map(({ label, value: v, icon, description, href }) =>
                    !href ? (
                        <DropdownOption
                            key={v}
                            $active={v === value}
                            onClick={() => {
                                // e.stopPropagation()
                                onChange(v)
                            }}
                        >
                            {icon && <DropdownIcon icon={icon} />}
                            <Flex $column $justify="flex-start" $align="flex-start">
                                <Text $fontWeight={700}>{label}</Text>
                                <Text>{description}</Text>
                            </Flex>
                        </DropdownOption>
                    ) : (
                        <Link key={v} href={href} $textDecoration="none">
                            <DropdownOption
                                $active={v === value}
                                onClick={() => {
                                    // e.stopPropagation()
                                    onChange(v)
                                }}
                            >
                                {icon && <DropdownIcon icon={icon} />}
                                <Flex $column $justify="flex-start" $align="flex-start">
                                    <Text $fontWeight={700}>{label}</Text>
                                    <Text>{description}</Text>
                                </Flex>
                            </DropdownOption>
                        </Link>
                    )
                )}
            </Dropdown>
        </Container>
    )
}

const Container = styled(CenteredFlex)`
    position: relative;
    min-height: 80px;
    padding: 0 12px;
    border-bottom: 2px solid rgba(0, 0, 0, 0.1);
    cursor: pointer;
`
const HiddenText = styled(Title)`
    visibility: hidden;
    white-space: pre-wrap;
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
    white-space: pre-wrap;
`
const IconContainer = styled(CenteredFlex)<{ $active?: boolean }>`
    margin-top: 8px;
    transition: all 0.5s ease;
    transform: rotate(${({ $active }) => ($active ? -180 : 0)}deg);
    & > svg {
        pointer-events: none;
        width: 32px;
        height: auto;
        fill: ${({ theme }) => theme.colors.yellowish};
        stroke: black;
        stroke-width: 1px;
    }
`

const Dropdown = styled(Popout)`
    width: 400px;
    max-width: calc(100vw - 72px);
    padding: 24px;
    margin-right: -14px;
    gap: 12px;
    cursor: default;
`
const DropdownOption = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    ...props,
}))<{ $active?: boolean }>`
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    font-size: 0.8em;
    cursor: pointer;

    background-color: ${({ $active = false }) => ($active ? 'rgba(0,0,0,0.05)' : 'transparent')};

    &:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }
`

function DropdownIcon({ icon }: { icon: BrandedSelectOption['icon'] }) {
    if (!icon) return null

    if (typeof icon === 'string') {
        if (TOKEN_LOGOS[icon as TokenKey]) return <TokenArray tokens={[icon as TokenKey]} size={52} />
        return <CyclingTokenArray size={52} includeProtocolTokens={icon === 'ALL_TOKENS'} />
    }

    if (Array.isArray(icon)) {
        if (typeof icon[0] === 'string') return <CyclingTokenArray size={52} tokens={icon as TokenKey[]} />
        return <IconCycler size={52} icons={icon.map((i) => ({ icon: i }))} />
    }

    return <IconCycler.Container $size={52}>{icon}</IconCycler.Container>
}

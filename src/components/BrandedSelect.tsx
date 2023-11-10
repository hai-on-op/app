import { type ChangeEventHandler } from 'react'

import styled from 'styled-components'
import { CenteredFlex, type TextProps, Title } from '~/styles'
import Caret from './Icons/Caret'

type BrandedSelectProps = TextProps & {
    width?: string,
    options: { label: string, value: string }[],
    value: string,
    onChange: ChangeEventHandler<HTMLSelectElement>
}
export function BrandedSelect({ width, options, value, ...props }: BrandedSelectProps) {
    return (
        <Container
            $width={width}
            $gap={12}>
            <Select
                as="select"
                value={value}
                $color="yellowish"
                $fontSize="3.6em"
                $lineHeight="1"
                {...props}>
                {options.map(({ label, value: v }) => (
                    <option
                        key={v}
                        value={v}
                        selected={v === value}>
                        {label}
                    </option>
                ))}
            </Select>
            <Caret/>
        </Container>
    )
}

const Container = styled(CenteredFlex)<{ $width?: string }>`
    position: relative;
    width: ${({ $width = 'auto' }) => $width};
    height: 80px;
    padding: 0 12px;
    border-bottom: 2px solid rgba(0,0,0,0.1);
    cursor: pointer;
    & > svg {
        pointer-events: none;
        position: absolute;
        right: 12px;
        transform: rotate(90deg);
    }
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
    cursor: pointer;
`
import { type HTMLProps } from 'react'

import styled from 'styled-components'
import { CenteredFlex } from '~/styles'
import { Check } from './Icons/Check'

export type CheckboxProps = Omit<HTMLProps<HTMLInputElement>, 'ref' | 'as' | 'type' | 'onChange' | 'children'> & {
    onChange?: (value: boolean) => void
    size?: number
}
export function CheckBox({ checked, onChange, size = 20, ...props }: CheckboxProps) {
    return (
        <Container $active={checked} $size={size}>
            <Check />
            <HiddenInput {...props} type="checkbox" checked={checked} onChange={(e) => onChange?.(e.target.checked)} />
        </Container>
    )
}

const Container = styled(CenteredFlex)<{ $active?: boolean; $size: number }>`
    position: relative;
    width: ${({ $size }) => $size}px;
    height: ${({ $size }) => $size}px;
    border-radius: 50%;
    border: ${({ theme }) => theme.border.thin};
    background-color: ${({ $active }) => ($active ? 'black' : 'transparent')};

    & > svg {
        width: 70%;
        height: auto;
        stroke: ${({ $active }) => ($active ? 'white' : 'transparent')};
        stroke-width: 3px;
    }

    cursor: pointer;
`

const HiddenInput = styled.input`
    position: absolute;
    inset: 0px;
    opacity: 0;
    z-index: 1;
    cursor: pointer;
`

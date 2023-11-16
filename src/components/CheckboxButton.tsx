import type { ReactChildren } from '~/types'

import styled from 'styled-components'
import { HaiButton, Text } from '~/styles'

type CheckboxButtonProps = {
    checked: boolean,
    toggle: () => void,
    children: ReactChildren
}
export function CheckboxButton({ checked, toggle, children }: CheckboxButtonProps) {
    return (
        <Button onClick={toggle}>
            <Checkbox $active={checked}/>
            <Text>{children}</Text>
        </Button>
    )
}

const Button = styled(HaiButton)`
    height: 48px;
    padding-left: 12px;
    font-weight: 400;
`
const Checkbox = styled.div<{ $active?: boolean }>`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: ${({ theme }) => theme.border.thin};
    background-color: ${({ $active }) => $active ? 'black': 'transparent'};
`
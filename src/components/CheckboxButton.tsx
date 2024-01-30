import type { ReactChildren } from '~/types'

import styled from 'styled-components'
import { HaiButton, Text } from '~/styles'
import { CheckBox } from './CheckBox'

type CheckboxButtonProps = {
    checked: boolean
    toggle: () => void
    children: ReactChildren
}
export function CheckboxButton({ checked, toggle, children }: CheckboxButtonProps) {
    return (
        <Button onClick={toggle}>
            <CheckBox checked={checked} />
            <Text>{children}</Text>
        </Button>
    )
}

const Button = styled(HaiButton)`
    height: 48px;
    padding-left: 12px;
    font-weight: 400;
    justify-content: flex-start;
`

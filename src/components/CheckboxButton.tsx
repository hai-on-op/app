import styled from 'styled-components'
import { HaiButton, Text } from '~/styles'
import { CheckBox, type CheckboxProps } from './CheckBox'

type CheckboxButtonProps = CheckboxProps & {
    toggle: () => void
    children: string
}
export function CheckboxButton({ checked, toggle, children, ...props }: CheckboxButtonProps) {
    return (
        <Button onClick={toggle}>
            <CheckBox aria-label={children} {...props} checked={checked} />
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

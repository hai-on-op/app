import { useState } from 'react'

import type { ReactChildren } from '~/types'
import { useOutsideClick } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Popout } from '~/styles'
import { Caret } from './Icons/Caret'

type BrandedDropdownProps = {
    label: ReactChildren,
    children: ReactChildren
}
export function BrandedDropdown({ label, children }: BrandedDropdownProps) {
    const [container, setContainer] = useState<HTMLElement>()
    const [expanded, setExpanded] = useState(false)

    useOutsideClick(container, () => setExpanded(false))

    return (
        <Container
            ref={setContainer as any}
            onClick={() => setExpanded(e => !e)}>
            <CenteredFlex $gap={12}>
                {label}
                <IconContainer $rotate={expanded}>
                    <Caret direction="down"/>
                </IconContainer>
            </CenteredFlex>
            <Dropdown
                $float="left"
                $margin="20px"
                hidden={!expanded}>
                {children}
            </Dropdown>
        </Container>
    )
}

const Container = styled(HaiButton)`
    height: 48px;
`

const IconContainer = styled(CenteredFlex)<{ $rotate?: boolean }>`
    transition: all 0.5s ease;
    transform: ${({ $rotate }) => $rotate ? 'rotate(-180deg)': 'rotate(0deg)'};
`

const Dropdown = styled(Popout)`
    min-width: 100%;
    width: fit-content;
    padding: 24px;
    margin-right: -22px;
    gap: 12px;
`

export const DropdownOption = styled(Flex).attrs(props => ({
    $width: '100%',
    $align: 'center',
    $gap: 12,
    ...props
}))`
    min-width: 160px;
    padding: 8px 16px;
    border-radius: 999px;
    border: 2px solid rgba(0,0,0,0.1);
    cursor: pointer;

    &:hover {
        background-color: rgba(0,0,0,0.1);
    }
`
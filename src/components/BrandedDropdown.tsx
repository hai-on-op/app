import { useState } from 'react'

import type { ReactChildren } from '~/types'
import { useOutsideClick } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, HaiButton, Popout } from '~/styles'
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
                <Caret direction="down"/>
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

const Dropdown = styled(Popout)`
    min-width: 100%;
    width: fit-content;
    padding: 24px;
    margin-right: -22px;
    gap: 12px;
`
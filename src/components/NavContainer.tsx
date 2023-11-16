import { type ReactNode } from 'react'

import styled, { css } from 'styled-components'
import { BlurContainer, CenteredFlex, Flex, Grid } from '~/styles'

type NavContainerProps = {
    navItems: string[],
    selected: number,
    onSelect: (index: number) => void,
    headerContent?: JSX.Element | ReactNode | ReactNode[],
    children: JSX.Element | ReactNode | ReactNode[]
}
export function NavContainer({
    navItems,
    selected,
    onSelect,
    headerContent,
    children
}: NavContainerProps) {
    return (
        <Container>
            <Header>
                <NavGrid $columns={navItems.map(() => '1fr').join(' ')}>
                    {navItems.map((item, i) => (
                        <Nav
                            key={i}
                            $active={selected === i}
                            onClick={() => onSelect(i)}>
                            {item}
                        </Nav>
                    ))}
                </NavGrid>
                {headerContent}
            </Header>
            <Body>{children}</Body>
        </Container>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
`

const Header = styled(Flex).attrs(props => ({
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props
}))`
    position: relative;
    height: 144px;
    padding: 0 48px;
    border-bottom: ${({ theme }) => theme.border.medium};
    z-index: 1;
`
const NavGrid = styled(Grid).attrs(props => ({
    $align: 'flex-end',
    ...props
}))<{ $active?: boolean }>`
    height: 100%;
`
const Nav = styled(CenteredFlex)<{ $active?: boolean }>`
    padding: 24px 16px;
    ${({ theme, $active = false }) => ($active
        ? css`
            border-bottom: ${theme.border.medium};
            font-weight: 700;
        `
        : css`
            border-bottom: 2px solid transparent;
            font-weight: 400;
        `
    )}
    cursor: pointer;
`
const Body = styled(Flex).attrs(props => ({
    $column: true,
    $gap: 24,
    ...props
}))`
    width: 100%;
    padding: 48px;
    padding-top: 24px;
`
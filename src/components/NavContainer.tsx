import type { ReactChildren } from '~/types'

import styled, { css } from 'styled-components'
import { BlurContainer, type BlurContainerProps, CenteredFlex, Flex, Grid } from '~/styles'

type NavContainerProps = BlurContainerProps & {
    navItems: string[],
    selected: number,
    onSelect: (index: number) => void,
    headerContent?: ReactChildren,
    children: ReactChildren,
}
export function NavContainer({
    navItems,
    selected,
    onSelect,
    headerContent,
    children,
    ...props
}: NavContainerProps) {
    return (
        <Container {...props}>
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
    ...props,
}))`
    position: relative;
    height: 144px;
    padding: 0 48px;
    border-bottom: ${({ theme }) => theme.border.medium};

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        height: auto;
        padding: 24px;
        gap: 12px;
        & > * {
            width: 100%;
        }
    `}

    z-index: 1;
`
const NavGrid = styled(Grid).attrs(props => ({
    $align: 'flex-end',
    ...props,
}))<{ $active?: boolean }>`
    height: 100%;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        width: 100%;
        height: 48px;
        align-items: center;
        font-size: 0.8em;
        border: ${theme.border.medium};
        border-radius: 999px;
    `}
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
    ${({ theme, $active = false }) => theme.mediaWidth.upToSmall`
        height: 100%;
        padding: 0 16px;
        font-weight: 700;
        color: ${theme.colors.secondary};
        &:not(:first-child) {
            border-left: 1px solid black;
        }
        ${$active && css`
            color: black;
            border-bottom: none;
        `}
    `}

    cursor: pointer;
`
const Body = styled(Flex).attrs(props => ({
    $column: true,
    $gap: 24,
    ...props,
}))`
    width: 100%;
    padding: 48px;
    padding-top: 24px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 0px;
        gap: 0px;
    `}
`

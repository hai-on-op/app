import type { ReactChildren } from '~/types'
import { type MediaWidth } from '~/utils'

import styled, { css } from 'styled-components'
import { BlurContainer, type BlurContainerProps, CenteredFlex, Flex, Grid } from '~/styles'

type NavContainerProps = BlurContainerProps & {
    navItems: string[]
    selected: number
    onSelect: (index: number) => void
    stackHeader?: boolean
    headerContent?: ReactChildren
    children: ReactChildren
    compactQuery?: MediaWidth
}
export function NavContainer({
    navItems,
    selected,
    onSelect,
    stackHeader = false,
    headerContent,
    compactQuery = 'upToSmall',
    children,
    ...props
}: NavContainerProps) {
    return (
        <Container {...props}>
            <Header $stack={stackHeader} $compactQuery={compactQuery}>
                {!!navItems.length && (
                    <NavGrid $columns={navItems.map(() => '1fr').join(' ')} $compactQuery={compactQuery}>
                        {navItems.map((item, i) => (
                            <Nav
                                key={i}
                                $active={selected === i}
                                onClick={() => onSelect(i)}
                                $compactQuery={compactQuery}
                            >
                                {item}
                            </Nav>
                        ))}
                    </NavGrid>
                )}
                {headerContent}
            </Header>
            <Body $compactQuery={compactQuery}>{children}</Body>
        </Container>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
`

const Header = styled(Flex).attrs((props) => ({
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props,
}))<{ $stack: boolean; $compactQuery: MediaWidth }>`
    position: relative;
    height: 144px;
    padding: 0 48px;
    border-bottom: ${({ theme }) => theme.border.medium};
    ${({ $stack }) =>
        $stack &&
        css`
            flex-direction: column-reverse;
            justify-content: flex-end;
            align-items: flex-start;
            height: auto;
            padding-top: 48px;
        `}

    ${({ theme, $compactQuery }) => theme.mediaWidth[$compactQuery]`
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
const NavGrid = styled(Grid).attrs((props) => ({
    $align: 'flex-end',
    ...props,
}))<{ $active?: boolean; $compactQuery: MediaWidth }>`
    height: 100%;

    ${({ theme, $compactQuery }) => theme.mediaWidth[$compactQuery]`
        width: 100%;
        height: 48px;
        align-items: center;
        font-size: 0.8em;
        border: ${theme.border.medium};
        border-radius: 999px;
    `}
`
const Nav = styled(CenteredFlex)<{ $active?: boolean; $compactQuery: MediaWidth }>`
    padding: 24px 16px;
    ${({ theme, $active = false }) =>
        $active
            ? css`
                  border-bottom: ${theme.border.medium};
                  font-weight: 700;
              `
            : css`
                  border-bottom: 2px solid transparent;
                  font-weight: 400;
              `}
    ${({ theme, $active = false, $compactQuery }) => theme.mediaWidth[$compactQuery]`
        height: 100%;
        padding: 0 16px;
        font-weight: 700;
        color: ${theme.colors.secondary};
        &:not(:first-child) {
            border-left: 1px solid black;
        }
        ${
            $active &&
            css`
                color: black;
                border-bottom: none;
            `
        }
    `}

    cursor: pointer;
`
const Body = styled(Flex).attrs((props) => ({
    $column: true,
    $gap: 24,
    ...props,
}))<{ $compactQuery: MediaWidth }>`
    width: 100%;
    padding: 48px;
    padding-top: 24px;

    ${({ theme, $compactQuery }) => theme.mediaWidth[$compactQuery]`
        padding: 0px;
        gap: 0px;
    `}
`

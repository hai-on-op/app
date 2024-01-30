import styled, { css } from 'styled-components'

type Alignment = 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'

export type GridProps = {
    $width?: string
    $columns?: string
    $rows?: string
    $gap?: number | string
    $justify?: Alignment
    $align?: Alignment
}

export const Grid = styled.div<GridProps>`
    display: grid;
    ${({ $width = undefined }) =>
        $width &&
        css`
            width: ${$width};
        `}
    ${({ $columns = undefined }) =>
        $columns &&
        css`
            grid-template-columns: ${$columns};
        `}
    ${({ $rows = undefined }) =>
        $rows &&
        css`
            grid-template-rows: ${$rows};
        `}
    ${({ $gap = undefined }) =>
        $gap &&
        css`
            grid-gap: ${typeof $gap === 'string' ? $gap : $gap + 'px'};
        `}
    justify-items: ${({ $justify = 'stretch' }) => $justify};
    align-items: ${({ $align = 'stretch' }) => $align};
`

export const FullWidthGridContainer = styled.div`
    grid-column: 1 / -1;
`

export const FullHeightGridContainer = styled.div`
    grid-row: 1 / -1;
`

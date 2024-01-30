import styled, { css } from 'styled-components'
import { type TextProps, TextStyle } from './Text'

type Alignment = 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'

export type FlexProps = TextProps & {
    $direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse'
    $column?: boolean
    $justify?: Alignment
    $align?: Alignment
    $flexWrap?: boolean
    $width?: string
    $gap?: number | string
    $grow?: number
    $shrink?: number
}

export const FlexStyle = css<FlexProps>`
    ${TextStyle}
    display: flex;
    flex-direction: ${({ $direction = undefined, $column }) => $direction || ($column ? 'column' : 'row')};
    justify-content: ${({ $justify = 'stretch' }) => $justify};
    align-items: ${({ $align = 'stretch' }) => $align};
    flex-wrap: ${({ $flexWrap = false }) => ($flexWrap ? 'wrap' : 'nowrap')};
    ${({ $width = undefined }) =>
        $width &&
        css`
            width: ${$width};
        `}
    ${({ $gap = undefined }) =>
        $gap &&
        css`
            gap: ${typeof $gap === 'string' ? $gap : $gap + 'px'};
        `}
    ${({ $grow = undefined }) =>
        $grow !== undefined &&
        css`
            flex-grow: ${$grow};
        `}
    ${({ $shrink = undefined }) =>
        $shrink !== undefined &&
        css`
            flex-shrink: ${$shrink};
        `}
`

export const Flex = styled.div<FlexProps>`
    ${FlexStyle}
`

export const CenteredFlex = styled(Flex).attrs((props) => ({
    ...props,
    $justify: 'center',
    $align: 'center',
}))`
    ${FlexStyle}
`

import styled, { css } from 'styled-components'

export type TextProps = {
    $color?: string
    $textAlign?: 'left' | 'center' | 'right'
    $fontFamily?: string
    $fontSize?: number | string
    $fontWeight?: number | 'bold' | 'bolder' | 'normal' | 'light' | 'lighter'
    $whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line' | 'break-spaces'
    $textOverflow?: 'ellipsis' | 'clip'
    $textTransform?: 'uppercase' | 'capitalize' | 'lowercase'
    $textDecoration?: 'none' | 'underline' | 'overline' | 'line-through'
    $letterSpacing?: number | string
    $lineHeight?: number | string
    $fontStyle?: 'normal' | 'italic'
    $padding?: string
}

export const TextStyle = css<TextProps>`
    ${({ theme, $color = undefined }) =>
        $color &&
        css`
            color: ${(theme.colors as any)[$color] || $color};
        `}
    ${({ $textAlign = undefined }) =>
        $textAlign &&
        css`
            text-align: ${$textAlign};
        `}
    ${({ $fontFamily = undefined }) =>
        $fontFamily &&
        css`
            font-family: ${$fontFamily};
        `}
    ${({ $fontSize = undefined }) =>
        $fontSize &&
        css`
            font-size: ${typeof $fontSize === 'string' ? $fontSize : `${$fontSize}px`};
        `}
    ${({ $fontWeight = undefined }) =>
        $fontWeight &&
        css`
            font-weight: ${$fontWeight};
        `}
    ${({ $whiteSpace = undefined }) =>
        $whiteSpace &&
        css`
            white-space: ${$whiteSpace};
        `}
    ${({ $textOverflow = undefined }) =>
        $textOverflow &&
        css`
            text-overflow: ${$textOverflow};
        `}
    ${({ $textTransform = undefined }) =>
        $textTransform &&
        css`
            text-transform: ${$textTransform};
        `}
    ${({ $textDecoration = undefined }) =>
        $textDecoration &&
        css`
            text-decoration: ${$textDecoration};
        `}
    ${({ $letterSpacing = undefined }) =>
        $letterSpacing &&
        css`
            letter-spacing: ${typeof $letterSpacing === 'string' ? $letterSpacing : `${$letterSpacing}px`};
        `}
    ${({ $lineHeight = undefined }) =>
        $lineHeight &&
        css`
            line-height: ${typeof $lineHeight === 'string' ? $lineHeight : `${$lineHeight}px`};
        `}
    ${({ $fontStyle = undefined }) =>
        $fontStyle &&
        css`
            font-style: ${$fontStyle};
        `}
    padding: ${({ $padding = '0px' }) => $padding};
`

export const Text = styled.div<TextProps>`
    ${TextStyle}
`

export const Title = styled.h1<TextProps>`
    ${TextStyle}
    ${({ $fontFamily = 'Poppins' }) =>
        $fontFamily &&
        css`
            font-family: ${$fontFamily};
        `}
    ${({ $fontSize = '4.5rem' }) =>
        $fontSize &&
        css`
            font-size: ${typeof $fontSize === 'string' ? $fontSize : `${$fontSize}px`};
        `}
    ${({ $letterSpacing = '0.05rem' }) =>
        $letterSpacing &&
        css`
            letter-spacing: ${typeof $letterSpacing === 'string' ? $letterSpacing : `${$letterSpacing}px`};
        `}
    ${({ $fontWeight = 700 }) =>
        $fontWeight &&
        css`
            font-weight: ${$fontWeight};
        `}
    -webkit-text-stroke: 0.025em black;
    // text-shadow: 1px 1px 0.5px black,
    //     -1px 1px 0.5px black,
    //     1px -1px 0.5px black,
    //     -1px -1px 0.5px black,
    //     1px 0px 0.5px black,
    //     -1px 0px 0.5px black,
    //     0px 1px 0.5px black,
    //     0px -1px 0.5px black,
    //     1.3px 1.3px 0.25px black,
    //     -1.3px 1.3px 0.25px black,
    //     1.3px -1.3px 0.25px black,
    //     -1.3px -1.3px 0.25px black,
    //     1.8px 0px 0.25px black,
    //     -1.8px 0px 0.25px black,
    //     0px 1.8px 0.25px black,
    //     0px -1.8px 0.25px black;
`

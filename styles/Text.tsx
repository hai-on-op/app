import styled, { css } from 'styled-components'

export type TextProps = {
	$color?: string,
	$textAlign?: 'left' | 'center' | 'right',
	$fontFamily?: string,
	$fontSize?: number | string,
	$fontWeight?: number | 'bold' | 'bolder' | 'normal' | 'light' | 'lighter',
	$whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line' | 'break-spaces',
	$textOverflow?: 'ellipsis' | 'clip',
	$textTransform?: 'uppercase' | 'capitalize' | 'lowercase',
	$textDecoration?: 'none' | 'underline' | 'overline' | 'line-through'
	$letterSpacing?: number | string,
	$lineHeight?: number | string,
	$fontStyle?: 'normal' | 'italic',
	$padding?: string
}

export const TextStyle = css<TextProps>`
	${({ $color = undefined }) => $color && css`color: ${$color};`}
	${({ $textAlign = undefined }) => $textAlign && css`text-align: ${$textAlign};`}
	${({ $fontFamily = undefined }) => $fontFamily && css`font-family: ${$fontFamily};`}
	${({ $fontSize = undefined }) => $fontSize && css`font-size: ${typeof $fontSize === 'string' ? $fontSize: `${$fontSize}px`};`}
	${({ $fontWeight = undefined }) => $fontWeight && css`font-weight: ${$fontWeight};`}
	${({ $whiteSpace = undefined }) => $whiteSpace && css`white-space: ${$whiteSpace};`}
	${({ $textOverflow = undefined }) => $textOverflow && css`text-overflow: ${$textOverflow};`}
	${({ $textTransform = undefined }) => $textTransform && css`text-transform: ${$textTransform};`}
	${({ $textDecoration = undefined }) => $textDecoration && css`text-decoration: ${$textDecoration};`}
	${({ $letterSpacing = undefined }) => $letterSpacing && css`letter-spacing: ${typeof $letterSpacing === 'string' ? $letterSpacing: `${$letterSpacing}px`};`}
	${({ $lineHeight = undefined }) => $lineHeight && css`line-height: ${typeof $lineHeight === 'string' ? $lineHeight: `${$lineHeight}px`};`}
	${({ $fontStyle = undefined }) => $fontStyle && css`font-style: ${$fontStyle};`}
	padding: ${({ $padding = '0px' }) => $padding};
`

export const Text = styled.div<TextProps>`
    ${TextStyle}
`
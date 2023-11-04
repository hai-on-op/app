import { type HTMLProps, type ReactNode } from 'react'

import styled from 'styled-components'
import { TextStyle, type TextProps } from '~/styles'

type ExternalLinkProps = TextProps & HTMLProps<HTMLAnchorElement> & {
	children: JSX.Element | ReactNode | ReactNode[]
}

export function ExternalLink({ children, ...props }: ExternalLinkProps) {
	return (
		<Link
			target="_blank"
			rel="noreferrer"
			$textDecoration="underline"
			{...(props as any)}>
			{children}
		</Link>
	)
}

const Link = styled.a<TextProps>`
    ${TextStyle}
    cursor: pointer;
`
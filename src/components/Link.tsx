import { type HTMLProps } from 'react'
import { Link as RRLink } from 'react-router-dom'

import type { ReactChildren } from '~/types'

import styled from 'styled-components'
import { type FlexProps, FlexStyle } from '~/styles'

type CleanAnchorProps = Omit<HTMLProps<HTMLAnchorElement>, 'ref' | 'as' | 'href' | 'content' | 'children'>
export type LinkProps = FlexProps &
    CleanAnchorProps & {
        type?: 'internal' | 'external'
        href: string
        children?: ReactChildren
    }

export function Link({ type, href, children, ...props }: LinkProps) {
    if (type === 'internal' || href.startsWith('/'))
        return (
            <InternalLink
                to={href}
                $width="fit-content"
                $justify="center"
                $align="center"
                $textDecoration="underline"
                {...props}
            >
                {children}
            </InternalLink>
        )

    return (
        <ExternalLink
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            $width="fit-content"
            $justify="center"
            $align="center"
            $textDecoration="underline"
            {...props}
        >
            {children}
        </ExternalLink>
    )
}

const InternalLink = styled(RRLink)<FlexProps>`
    ${FlexStyle}
    display: inline-flex;
    color: inherit;
    cursor: pointer;
`

const ExternalLink = styled.a<FlexProps>`
    ${FlexStyle}
    display: inline-flex;
    color: inherit;
    cursor: pointer;
`

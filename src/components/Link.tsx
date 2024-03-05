import { type HTMLProps } from 'react'
import { Link as RRLink } from 'react-router-dom'

import type { ReactChildren } from '~/types'

import styled, { css } from 'styled-components'
import { type FlexProps, FlexStyle } from '~/styles'

type CleanAnchorProps = Omit<HTMLProps<HTMLAnchorElement>, 'ref' | 'as' | 'href' | 'content' | 'children'>
export type LinkProps = FlexProps &
    CleanAnchorProps & {
        type?: 'internal' | 'external'
        href: string
        disabled?: boolean
        children?: ReactChildren
    }

export function Link({ type, href, disabled = false, children, ...props }: LinkProps) {
    if (type === 'internal' || href.startsWith('/'))
        return (
            <InternalLink
                to={href}
                $disabled={disabled}
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
            $disabled={disabled}
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

const InternalLink = styled(RRLink)<FlexProps & { $disabled: boolean }>`
    ${FlexStyle}
    display: inline-flex;
    color: inherit;
    cursor: pointer;

    ${({ $disabled }) =>
        $disabled &&
        css`
            pointer-events: none;
        `}
`

const ExternalLink = styled.a<FlexProps & { $disabled: boolean }>`
    ${FlexStyle}
    display: inline-flex;
    color: inherit;
    cursor: pointer;

    ${({ $disabled }) =>
        $disabled &&
        css`
            pointer-events: none;
        `}
`

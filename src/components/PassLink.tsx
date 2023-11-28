import { type HTMLProps } from 'react'
import { Link } from 'react-router-dom'

import type { ReactChildren } from '~/types'

import styled from 'styled-components'
import { type FlexProps, FlexStyle, Text, type TextProps } from '~/styles'

type CleanAnchorProps = Omit<HTMLProps<HTMLAnchorElement>, 'ref' | 'as' | 'href' | 'content' | 'children'>
type PassLinkProps = TextProps & FlexProps & CleanAnchorProps & {
    href: string,
    content?: ReactChildren,
    children?: ReactChildren
}
export function PassLink({
    href,
    content,
    children,
    onClick,
    style,
    ...props
}: PassLinkProps) {
    return (
        <CustomLink
            to={href}
            style={style}
            onClick={onClick}
            $width="fit-content"
            $justify="center"
            $align="center"
            {...props}>
            {content || (
                <Text
                    as="span"
                    $textDecoration="underline"
                    {...props}>
                    {children}
                </Text>
            )}
        </CustomLink>
    )
}

const CustomLink = styled(Link)<FlexProps>`
    ${FlexStyle}
    color: inherit;
    cursor: pointer;
`
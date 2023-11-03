import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import styled from 'styled-components'
import { type FlexProps, FlexStyle, Text, type TextProps } from '~/styles'

type PassLinkProps = TextProps & FlexProps & {
    href: string,
    style?: object,
    content?: JSX.Element | ReactNode | ReactNode[],
    children?: JSX.Element | ReactNode | ReactNode[],
    onClick?: any
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
            $justify="center"
            $align="center"
            {...props}>
            {content || (
                <Text
                    as="span"
                    $textDecoration="underline"
                    $fontWeight={700}
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
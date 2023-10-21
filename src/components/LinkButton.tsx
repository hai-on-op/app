import { ReactNode } from 'react'
import { ArrowRightCircle } from 'react-feather'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { ButtonProps, ButtonStyle } from '@/styles'

interface Props {
    url: string
    id?: string
    disabled?: boolean
    text?: string
    isExternal?: boolean
    withArrow?: boolean
    children?: ReactNode
    color?: 'blueish' | 'greenish' | 'yellowish' | 'colorPrimary' | 'colorSecondary'
}
const LinkButton = ({
    id,
    text,
    disabled,
    url,
    isExternal,
    withArrow,
    children,
    color = 'blueish',
    ...rest
}: Props) => {
    return isExternal ? (
        <ExtLink id={id} {...rest} href={url} target="_blank" rel="norefferer" disabled={disabled} color={color}>
            {children}
            <span>{text}</span> {withArrow && <ArrowRightCircle size={'18'} />}
        </ExtLink>
    ) : (
        <CustomLink id={id} {...rest} to={url} color={color} disabled={disabled}>
            {children}
            <span>{text}</span> {withArrow && <ArrowRightCircle size={'18'} />}
        </CustomLink>
    )
}

export default LinkButton

const ExtLink = styled.a<ButtonProps>`
    ${ButtonStyle}
    transition: opacity 0.3s ease;
    &:hover {
        opacity: 0.9;
    }
`
const CustomLink = styled(Link)<ButtonProps>`
    ${ButtonStyle}
    transition: opacity 0.3s ease;
    &:hover {
        opacity: 0.9;
    }
`

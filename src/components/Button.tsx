import React, { type HTMLProps } from 'react'
import { useTranslation } from 'react-i18next'

import type { ReactChildren } from '~/types'

import styled from 'styled-components'
import { Arrow } from './Icons/Arrow'
import { Loader } from './Loader'

import darkArrow from '~/assets/dark-arrow.svg'

type ButtonProps = Omit<HTMLProps<HTMLButtonElement>, 'ref' | 'as' | 'type' | 'children'> & {
    text?: string,
    variant?: 'default' | 'primary' | 'secondary' | 'dimmed' | 'dimmedNormal' | 'bordered',
    withArrow?: boolean | 'left' | 'right',
    isLoading?: boolean,
    isBordered?: boolean,
    children?: ReactChildren
}

const Button = ({
    text,
    variant = 'default',
    withArrow = false,
    isLoading,
    isBordered,
    children,
    ...props
}: ButtonProps) => {
    const { t } = useTranslation()

    if (variant === 'dimmed') return (
        <DimmedBtn {...props}>
            {withArrow && withArrow !== 'right' && <img src={darkArrow} alt={''} />}
            {!!text && t(text)}
            {withArrow === 'right' && <img src={darkArrow} alt={''} className="rotate" />}
        </DimmedBtn>
    )
    if (withArrow) return (
        <ArrowBtn {...props}>
            {!!text && <span>{t(text)}&nbsp;</span>}
            <Arrow/>
        </ArrowBtn>
    )
    if (variant === 'bordered') return (
        <BorderedBtn {...props}>
            <Inner>{text && t(text)}</Inner>
        </BorderedBtn>
    )

    return (
        <Container
            {...props}
            variant={variant}
            isLoading={isLoading}>
            {text && t(text)}
            {children || null}
            {isLoading && <Loader/>}
        </Container>
    )
}

export default React.memo(Button)

const Container = styled.button<{ variant: ButtonProps['variant'], isLoading?: boolean }>`
    outline: none;
    cursor: pointer;
    min-width: 134px;
    border: none;
    box-shadow: none;
    padding: 8px 30px;
    line-height: 24px;
    font-size: ${({ theme }) => theme.font.small};
    font-weight: 600;
    color: ${({ theme }) => theme.colors.neutral};
    border-radius: 50px;
    transition: all 0.3s ease;

    background: ${({ theme, variant }) => {
        switch(variant) {
            case 'dimmedNormal':
                return theme.colors.secondary
            case 'primary':
                return theme.colors.colorPrimary
            case 'secondary':
                return theme.colors.colorSecondary
            default:
                return theme.colors.blueish
        }
    }}
    &:hover {
        opacity: 0.8;
    }

    &:disabled {
        background: ${({ theme, isLoading }) => (isLoading
            ? theme.colors.placeholder
            : theme.colors.secondary
        )};
        cursor: not-allowed;
    }
`

const DimmedBtn = styled.button`
    cursor: pointer;
    border: none;
    box-shadow: none;
    outline: none;
    background: transparent;
    border-radius: 0;
    color: ${({ theme }) => theme.colors.secondary};
    font-size: ${({ theme }) => theme.font.small};
    font-weight: 600;
    line-height: 24px;
    padding: 0;
    margin: 0;
    display: flex;
    align-items: center;
    img {
        margin-right: 3px;
        &.rotate {
            transform: rotate(180deg);
            margin-right: 0;
            margin-left: 3px;
        }
    }
    transition: all 0.3s ease;
    &:hover {
        opacity: 0.8;
    }
    &:disabled {
        cursor: not-allowed;
    }
`

const ArrowBtn = styled.button`
    span {
        background: ${({ theme }) => theme.colors.gradient};
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        color: ${({ theme }) => theme.colors.inputBorderColor};
    }
    background: transparent;
    border: 0;
    cursor: pointer;
    box-shadow: none;
    outline: none;
    padding: 0;
    margin: 0;
    font-size: ${({ theme }) => theme.font.small};
    font-weight: 600;
    line-height: 24px;
    letter-spacing: -0.18px;
    transition: all 0.3s ease;

    &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
        &:hover {
            opacity: 0.5;
        }
    }
    &:hover {
        opacity: 0.8;
    }
`

const BorderedBtn = styled.button`
    background: ${({ theme }) => theme.colors.gradient};
    padding: 2px;
    border-radius: 25px;
    box-shadow: none;
    outline: none;
    border: 0;
    cursor: pointer;
    &:disabled {
        cursor: not-allowed;
    }
`

const Inner = styled.div`
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.inputBorderColor};
    border-radius: 25px;
    padding: 4px 6px;
    transition: all 0.3s ease;
    &:hover {
        opacity: 0.8;
    }
`

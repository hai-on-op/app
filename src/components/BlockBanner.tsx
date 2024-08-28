import { useState } from 'react'

import { ReactChildren } from '~/types'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, FlexProps } from '~/styles'

type BlockBannerProps = FlexProps & {
    text: string
    width?: string
    active?: boolean
    children?: ReactChildren
}
export function BlockBanner({ text, width, active = true, children, ...props }: BlockBannerProps) {
    const [offset] = useState(() => Math.floor(5 * Math.random()))
    const [rotation] = useState(() => Math.floor(-5 + 10 * Math.random()))

    if (!active) return <>{children}</>

    return (
        <Container $width="100%" $justify="center" $align="center" {...props}>
            {children}
            {text.split('').map((char, i) => () => <span key={i}>{char}</span>)}
            <Band $width={width} $offset={offset} style={{ transform: `rotate(${rotation}deg)` }}>
                {text.split('').map((char, i) => (
                    <>{char == ' ' ? <>&nbsp;</> : <span key={i}>{char}</span>}</>
                ))}
            </Band>
        </Container>
    )
}

const Container = styled(Flex)`
    position: relative;
`

const Band = styled(CenteredFlex)<{ $offset: number }>`
    position: absolute;
    padding: 4px 12px;
    background: black;

    & > span {
        font-weight: 700;
        letter-spacing: 0.05em;
        ${({ theme, $offset }) => css`
            &:nth-child(5n + ${(1 + $offset) % 5}) {
                color: ${theme.colors.greenish};
            }
            &:nth-child(5n + ${(2 + $offset) % 5}) {
                color: ${theme.colors.pinkish};
            }
            &:nth-child(5n + ${(3 + $offset) % 5}) {
                color: ${theme.colors.blueish};
            }
            &:nth-child(5n + ${(4 + $offset) % 5}) {
                color: ${theme.colors.yellowish};
            }
            &:nth-child(5n + ${$offset % 5}) {
                color: ${theme.colors.reddish};
            }
        `}
    }
`

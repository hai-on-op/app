import { Fragment, useEffect, useState } from 'react'

import styled from 'styled-components'
import { Flex } from '~/styles'

type IconWithBg = {
    icon: string | JSX.Element
    bg?: string
}

type IconCyclerProps = {
    size?: number
    icons: IconWithBg[]
    duration?: number
}
export function IconCycler({ size = 32, icons, duration = 1500 }: IconCyclerProps) {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        if (!icons.length) return

        const int = setInterval(() => {
            setIndex((i) => (i + 1) % icons.length)
        }, duration)

        return () => clearInterval(int)
    }, [icons, duration])

    if (!icons.length) return null

    return (
        <Container $size={size} $bg={icons[index]?.bg}>
            <Inner $index={index}>
                {icons.map(({ icon }, i) =>
                    typeof icon === 'string' ? <img key={i} src={icon} alt="" /> : <Fragment key={i}>{icon}</Fragment>
                )}
            </Inner>
        </Container>
    )
}

const Container = styled(Flex).attrs((props) => ({
    $justify: 'flex-start',
    $align: 'center',
    ...props,
}))<{ $size: number; $bg?: string }>`
    position: relative;
    width: ${({ $size }) => $size}px;
    height: ${({ $size }) => $size}px;
    border-radius: 50%;
    flex-shrink: 0;
    border: ${({ theme }) => theme.border.thin};
    transition: background 0.25s ease;
    background: ${({ theme, $bg = 'transparent' }) => (theme.colors as any)[$bg] || $bg};
    overflow: hidden;

    & img {
        width: ${({ $size }) => $size}px;
        height: ${({ $size }) => $size}px;
    }
`
const Inner = styled(Flex).attrs((props) => ({
    $justify: 'flex-start',
    $align: 'center',
    $shrink: 0,
    ...props,
}))<{ $index: number }>`
    position: absolute;
    top: -1px;
    bottom: -1px;
    transition: left 0.25s ease;
    left: ${({ $index }) => `calc(${-100 * $index}% - ${1 + 2 * $index}px)`};
`

IconCycler.Container = Container

import { useState, useRef, useEffect } from 'react'

import type { ReactChildren } from '~/types'

import styled, { css, keyframes } from 'styled-components'
import { CenteredFlex, Flex, type FlexProps, Text, type TextProps } from '~/styles'

type BannerHeaderProps = FlexProps & {
    text: string | string[]
    textOptions?: TextProps
    staticWidth?: number
    reverse?: boolean
    speed?: number
    spacing?: number
    children?: ReactChildren
}

export function Marquee({
    text,
    textOptions,
    staticWidth,
    reverse = false,
    speed = 1,
    spacing = 12,
    children,
}: BannerHeaderProps) {
    const textArray = Array.isArray(text) ? text : [text]

    const [chunk, setChunk] = useState<HTMLDivElement | null>(null)

    const [chunkWidth, setChunkWidth] = useState<number>()
    useEffect(() => {
        if (staticWidth) setChunkWidth(staticWidth + spacing)
        if (!text) setChunkWidth(undefined)
        if (!chunk) setChunkWidth(undefined)

        const onResize = () => {
            if (!chunk) return
            const { width } = chunk.getBoundingClientRect()
            setChunkWidth(width + spacing)
        }
        onResize()
        window.addEventListener('resize', onResize)

        return () => {
            window.removeEventListener('resize', onResize)
        }
    }, [chunk, text, spacing, staticWidth])

    const [repeat, setRepeat] = useState(1)
    const repeatRef = useRef(repeat)
    repeatRef.current = repeat

    useEffect(() => {
        if (!chunkWidth) return

        const onResize = () => {
            const w = window.innerWidth
            const r = Math.ceil(w / chunkWidth) + 1
            if (repeatRef.current !== r) setRepeat(r)
        }
        onResize()
        window.addEventListener('resize', onResize)

        return () => {
            window.removeEventListener('resize', onResize)
        }
    }, [chunkWidth])

    return (
        <Container>
            <Banner $scrollDistance={chunkWidth} $reverse={reverse} $speed={speed}>
                <Flex $width="100%" $gap={spacing}>
                    {Array.from({ length: repeat }, (_, i) => (
                        <MarqueeChunk
                            key={i}
                            ref={i === 0 ? setChunk : undefined}
                            $width={staticWidth ? `${staticWidth}px` : undefined}
                            $gap={spacing}
                        >
                            {textArray.map((t, j) => (
                                <Text key={j} $whiteSpace="nowrap" $textTransform="uppercase" {...textOptions}>
                                    {t}
                                </Text>
                            ))}
                        </MarqueeChunk>
                    ))}
                </Flex>
            </Banner>
            {children}
        </Container>
    )
}

const createScrollAnimation = (distance: number) => keyframes`
    0% { transform: translateX(0px) }
    100% { transform: translate(${-distance}px) }
`

const Container = styled(CenteredFlex).attrs((props) => ({
    $grow: 0,
    $shrink: 0,
    ...props,
}))`
    position: relative;
    width: 100%;
    height: 100%;
    overflow: visible;
`

const Banner = styled(Flex).attrs((props) => ({
    $justify: 'flex-start',
    $align: 'center',
    $shrink: 0,
    $grow: 0,
    ...props,
}))<{
    $scrollDistance?: number
    $speed: number
    $reverse?: boolean
}>`
    position: absolute;
    left: 0px;
    right: 0px;
    overflow: visible;
    ${({ $scrollDistance, $reverse, $speed }) => {
        if (!$scrollDistance) return ''

        const d = $reverse ? -$scrollDistance : $scrollDistance
        return css`
            & > div {
                animation: ${createScrollAnimation(d)} ${Math.max($scrollDistance / (50 * $speed), 0.5)}s linear
                    infinite;
                overflow: visible;
            }
        `
    }}
`

export const MarqueeChunk = styled(Flex).attrs((props) => ({
    $justify: 'space-between',
    $align: 'center',
    $shrink: 0,
    $grow: 0,
    ...props,
}))``

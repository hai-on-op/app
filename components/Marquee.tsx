import { useMemo, useState, ReactNode, useRef, useEffect } from 'react'

import styled, { css, keyframes } from 'styled-components'
import { CenteredFlex, Flex, FlexProps, Text, TextProps } from '@/styles'

const createScrollAnimation = (distance: number) => keyframes`
    0% { transform: translateX(0px) }
    100% { transform: translate(${-distance}px) }
`

export const MarqueeContainer = styled(CenteredFlex)`
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    height: 54px;
    background: ${({ theme }) => `linear-gradient(90deg, ${theme.colors.yellowish} 0%, ${theme.colors.orangeish} 100%)`};
    border-bottom: ${({ theme }) => theme.border.thick};
    color: black;
`

const Container = styled(CenteredFlex)`
    position: relative;
    width: 100%;
    height: 100%;
    overflow: visible;
`

const Banner = styled(Flex)<{ $scrollDistance?: number }>`
    position: absolute;
    left: 0px;
    right: 0px;
    overflow: visible;
    ${({ $scrollDistance }) => !!$scrollDistance && css`
        & > div {
            animation: ${createScrollAnimation($scrollDistance)} ${$scrollDistance / 50}s linear infinite;
            overflow: visible;
        }
    `}
    z-index: -1;
`

type BannerHeaderProps = FlexProps & {
    text: string | string[],
    textOptions?: TextProps,
    staticWidth?: number,
    spacing?: number,
    children?: JSX.Element | ReactNode | ReactNode[]
}

export function Marquee({ text, textOptions, staticWidth, spacing = 12, children }: BannerHeaderProps) {
    const textArray = Array.isArray(text) ? text: [ text ]

    const [ chunk, setChunk ] = useState<HTMLDivElement | null>(null)

    const chunkWidth: number | undefined = useMemo(() => {
        if (staticWidth) return staticWidth + spacing
        if (!chunk) return undefined

        const { width } = chunk.getBoundingClientRect()
        return width + spacing
    }, [ chunk, spacing, staticWidth ])

    const [ repeat, setRepeat ] = useState(1)
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
    }, [ chunkWidth ])

    return (
        <Container>
            <Banner $scrollDistance={chunkWidth}>
                <Flex
                    $width="100%"
                    $gap={spacing}>
                    {Array.from({ length: repeat }, (_, i) => (
                        <Flex
                            key={i}
                            ref={i === 0 ? setChunk: undefined}
                            $width={staticWidth ? `${staticWidth}px`: undefined}
                            $justify="space-between"
                            $align="center"
                            $gap={spacing}
                            $shrink={0}>
                            {textArray.map((t, j) => (
                                <Text
                                    key={j}
                                    $whiteSpace="nowrap"
                                    $fontWeight={700}
                                    $textTransform="uppercase"
                                    {...textOptions}>
                                    {t}
                                </Text>
                            ))}
                        </Flex>
                    ))}
                </Flex>
            </Banner>
            {children}
        </Container>
    )
}

export function TickerMarquee() {
    return (
        <MarqueeContainer>
            <Marquee text={['$HAI $1.50 134%', '\u2022']}/>
        </MarqueeContainer>
    )
}
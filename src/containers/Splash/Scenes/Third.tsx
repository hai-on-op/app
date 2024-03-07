import { useEffect, useRef, useState } from 'react'

import type { SplashImage } from '~/types'
import { LINK_TO_DOCS } from '~/utils'
import { useMediaQuery } from '~/hooks'

import styled, { keyframes } from 'styled-components'
import { CenteredFlex, Flex, Grid, Text } from '~/styles'
import { ZoomScene, type ZoomSceneProps } from './ZoomScene'
import { FloatingElements } from '~/components/BrandElements/FloatingElements'
import { HaiCoin } from '~/components/BrandElements/HaiCoin'
import { Elf } from '~/components/BrandElements/Elf'
import { BrandedTitle } from '~/components/BrandedTitle'
import { HaiFace } from '~/components/Icons/HaiFace'
import { Link } from '~/components/Link'

const clouds: SplashImage[] = [
    {
        index: 0,
        width: '260px',
        style: {
            right: '30%',
            bottom: '-150px',
        },
        zIndex: 1,
    },
    {
        index: 1,
        width: '190px',
        style: {
            right: '-140px',
            top: '-140px',
        },
        zIndex: -1,
    },
]

const CANVAS_SIZE = { x: 300, y: 60 }
const SINE_DURATION = 4_200
const CANVAS_PADDING = window.devicePixelRatio * 10
const DOT_SIZE = window.devicePixelRatio * 5
const ARROW_SIZE = window.devicePixelRatio * 14

export function Third({ zIndex }: ZoomSceneProps) {
    const isUpToExtraSmall = useMediaQuery('upToExtraSmall')
    const isUpToSmall = useMediaQuery('upToSmall')

    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
    const priceText = useRef<HTMLDivElement | null>(null)
    const changeText = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.fillStyle = 'black'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = devicePixelRatio * 2

        let frame: any
        let startTime = 0
        const onLoop = (timestamp: number) => {
            startTime = startTime || timestamp
            const progress = ((timestamp - startTime) / SINE_DURATION) % 1
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            const w = canvas.width - 2 * CANVAS_PADDING
            const h = canvas.height - 2 * CANVAS_PADDING
            const start: [number, number] = [
                CANVAS_PADDING,
                canvas.height / 2 - (h / 2) * Math.sin(2 * Math.PI * progress),
            ]

            // dot
            ctx.beginPath()
            ctx.ellipse(...start, DOT_SIZE, DOT_SIZE, 0, 0, 2 * Math.PI)
            ctx.fill()

            // sine wave
            ctx.moveTo(...start)
            ctx.beginPath()
            for (let i = 1; i < w - 4; i += 1) {
                ctx.lineTo(CANVAS_PADDING + i, canvas.height / 2 - (h / 2) * Math.sin(2 * Math.PI * (progress + i / w)))
            }
            const end: [number, number] = [
                CANVAS_PADDING + w,
                canvas.height / 2 - (h / 2) * Math.sin(2 * Math.PI * progress),
            ]
            ctx.stroke()

            // arrow
            const endTangentAngle = 0.6 * (Math.atan2(1, Math.cos(2 * Math.PI * progress)) - Math.PI / 2)
            ctx.beginPath()
            ctx.moveTo(...end)
            ctx.lineTo(
                end[0] - ARROW_SIZE * Math.cos(endTangentAngle - Math.PI / 6),
                end[1] - ARROW_SIZE * Math.sin(endTangentAngle - Math.PI / 6)
            )
            ctx.lineTo(
                CANVAS_PADDING + w - (ARROW_SIZE / 2) * Math.cos(endTangentAngle),
                end[1] - (ARROW_SIZE / 2) * Math.sin(endTangentAngle)
            )
            ctx.lineTo(
                end[0] - ARROW_SIZE * Math.cos(endTangentAngle + Math.PI / 6),
                end[1] - ARROW_SIZE * Math.sin(endTangentAngle + Math.PI / 6)
            )
            ctx.closePath()
            ctx.fill()

            // text
            if (priceText.current && changeText.current) {
                const p = Math.sin(2 * Math.PI * progress)
                priceText.current.textContent = `$${(1 + 0.03 * p).toFixed(2)}`
                changeText.current.textContent = `${Math.round(3 * p)}%${p > 0 ? '↑' : p < 0 ? '↓' : '-'}`
                changeText.current.style.color = p > 0 ? '#00AC11' : p < 0 ? '#ff0000' : 'inherit'
            }

            frame = requestAnimationFrame(onLoop)
        }
        frame = requestAnimationFrame(onLoop)

        return () => cancelAnimationFrame(frame)
    }, [canvas])

    return (
        <ZoomScene $zIndex={zIndex}>
            <Container>
                <Flex $column $gap={isUpToExtraSmall ? 12 : 24}>
                    <BrandedTitle
                        textContent="AVOID TURBULENCE WITH MELLOW MONEY TECHNOLOGY™"
                        $fontSize={isUpToExtraSmall ? '2rem' : isUpToSmall ? '2.6rem' : '2.9rem'}
                        $letterSpacing={isUpToExtraSmall ? '0.4rem' : isUpToSmall ? '0.5rem' : '0.5rem'}
                        $lineHeight={isUpToSmall ? '1.2' : '1.4'}
                    />
                    <Text $lineHeight="1.6">
                        $HAI is more stable than other stables, automatically.&nbsp;
                        <strong>
                            Learn more about the&nbsp;
                            <Link href={`${LINK_TO_DOCS}detailed/modules/pid_controller.html`}>
                                $HAI PID controller nerd stuff →
                            </Link>
                        </strong>
                    </Text>
                </Flex>
                <SmoothContainer>
                    <Flex $justify="flex-start" $align="center" $gap={12}>
                        <IconContainer>
                            <HaiFace filled />
                        </IconContainer>
                        <Text>HAI</Text>
                        <Text ref={priceText} $fontWeight={700} style={{ width: '48px' }}>
                            $1.00
                        </Text>
                        <Text ref={changeText}>0.0%-</Text>
                    </Flex>
                    <CenteredFlex $width="100%">
                        <SmoothCanvas
                            ref={setCanvas}
                            width={window.devicePixelRatio * CANVAS_SIZE.x}
                            height={window.devicePixelRatio * CANVAS_SIZE.y}
                        />
                    </CenteredFlex>
                </SmoothContainer>
            </Container>
            <FloatingElements clouds={clouds} />
            <FlyingElfContainer>
                <HaiCoin
                    variant="KITE"
                    width="66%"
                    rotateOnAxis={65}
                    style={{
                        top: '-18%',
                        left: '17%',
                        transform: 'rotate(84deg)',
                        zIndex: 0,
                    }}
                />
                <Wire />
                <Wire />
                <Elf
                    variant={4}
                    width="50%"
                    style={{
                        bottom: '0px',
                        transform: 'scaleX(-1)',
                        zIndex: 1,
                    }}
                />
            </FlyingElfContainer>
        </ZoomScene>
    )
}

const Container = styled(Grid).attrs((props) => ({
    $columns: '1fr min-content',
    $justify: 'center',
    $align: 'center',
    ...props,
}))`
    width: min(1100px, calc(100vw - 96px));
    padding: 72px 48px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    background-color: rgba(255, 255, 255, 0.5);

    ${({ theme }) => theme.mediaWidth.upToSmall`
        width: calc(100vw - 48px);
        grid-template-columns: 1fr;
        grid-gap: 24px;
        padding: 24px;
        padding-top: 36px;
    `}
    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        width: calc(100vw - 24px);
        padding-top: 24px;
    `}
`

const SmoothContainer = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'space-between',
    $align: 'flex-start',
    ...props,
}))`
    width: 360px;
    max-width: calc(100% - 24px);
    padding: 24px;
    gap: 24px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    background-color: #f1f1fb;
    transform: translateX(100px);

    ${({ theme }) => theme.mediaWidth.upToSmall`
        width: 100%;
        transform: none;
    `}
    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 12px;
        gap: 12px;
    `}
`
const IconContainer = styled(CenteredFlex)`
    width: 48px;
    height: 48px;
    border-radius: 999px;
    border: ${({ theme }) => theme.border.thin};
    background-color: ${({ theme }) => theme.colors.greenish};

    & > svg {
        width: 75%;
        height: auto;
    }
`
const SmoothCanvas = styled.canvas`
    width: ${CANVAS_SIZE.x}px;
    max-width: 100%;
    height: ${CANVAS_SIZE.y}px;
`

const float = keyframes`
    0% { transform: translateZ(40px) translateY(-8px) rotate(-3deg); }
    100% { transform: translateZ(40px) translateY(-36px) rotate(5deg); }
`
const FlyingElfContainer = styled(CenteredFlex)`
    position: absolute;
    right: min(100px, calc(100vw - 420px));
    top: 20px;
    width: 300px;
    height: 424px;
    transform-style: preserve-3d;
    transform: translateZ(40px);
    animation: ${float} 3s ease-in-out alternate infinite;
    pointer-events: none;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        right: -66px;
    `}

    z-index: 2;
`
const Wire = styled.div`
    position: absolute;
    width: 1px;
    background-color: rgba(0, 0, 0, 0.1);
    height: 82%;
    transform: rotate(-1deg);
    left: 40.5%;
    bottom: 40px;

    &:last-of-type {
        transform: rotate(7deg);
        left: auto;
        right: 34.5%;
        bottom: 45px;
        height: 64.5%;
    }

    z-index: 0;
`

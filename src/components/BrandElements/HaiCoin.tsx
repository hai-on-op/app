import { HTMLProps, useState } from 'react'

import type { TokenKey } from '~/types'
import { TOKEN_LOGOS } from '~/utils'

import styled, { css, keyframes } from 'styled-components'
import { CenteredFlex } from '~/styles'

type HaiCoinProps = Omit<HTMLProps<HTMLDivElement>, 'ref' | 'as'> & {
    variant?: TokenKey
    width?: string
    animated?: boolean
    thickness?: number
    rotateOnAxis?: number
}

export function HaiCoin({ variant = 'HAI', width, animated, thickness, rotateOnAxis, ...props }: HaiCoinProps) {
    const [animDuration] = useState(1.5 + 0.75 * Math.random())

    return (
        <HaiCoinImage {...props} $width={width}>
            <Inner $variant={variant} $animated={animated} $animDur={animDuration} $rotateOnAxis={rotateOnAxis}>
                <Face $thickness={thickness}>
                    <img src={TOKEN_LOGOS[variant]} alt="" style={{ width: '100%', height: '100%' }} />
                </Face>
                <InsidePiece $thickness={thickness} />
                <BackFace $thickness={thickness} />
            </Inner>
        </HaiCoinImage>
    )
}

const rotate = keyframes`
    0% { transform: rotateY(-45deg); }
    100% { transform: rotateY(45deg); }
`

export const HaiCoinImage = styled(CenteredFlex)<{ $width?: string }>`
    position: absolute;
    width: ${({ $width = 'auto' }) => $width};
    height: ${({ $width = 'auto' }) => $width};
    pointer-events: none;
`
const Face = styled(CenteredFlex)<{ $thickness?: number }>`
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.colors.greenish};
    transform: translateZ(${({ $thickness = 12 }) => $thickness}px);
    z-index: 3;

    & svg,
    & img {
        width: 80%;
        height: 80%;
    }
`
const BackFace = styled(Face)`
    background-color: #b2e3ad;
    transform: translateZ(-${({ $thickness = 12 }) => $thickness}px);
    z-index: 1;
`
const InsidePiece = styled.div<{ $thickness?: number }>`
    position: absolute;
    width: ${({ $thickness = 12 }) => 2 * $thickness}px;
    height: 100%;
    transform: rotateY(90deg);
    z-index: 2;
`
const Inner = styled(CenteredFlex)<{
    $variant?: HaiCoinProps['variant']
    $animated?: boolean
    $animDur: number
    $rotateOnAxis?: number
}>`
    width: 100%;
    height: 100%;
    perspective: 1000px;
    transform-style: preserve-3d;
    ${({ $animated, $animDur, $rotateOnAxis }) =>
        $rotateOnAxis
            ? css`
                  transform: rotateY(${$rotateOnAxis}deg);
              `
            : $animated &&
              css`
                  animation: ${rotate} ${$animDur}s ease-in-out infinite alternate;
              `}

    ${({ theme, $variant = 'HAI' }) => {
        let frontColor = theme.colors.greenish
        let backColor = '#B2E3AD'
        switch ($variant) {
            case 'KITE': {
                frontColor = '#EECABC'
                backColor = '#D6B5A8'
                break
            }
            case 'HAIVELO': {
                frontColor = '#FFFFFF'
                backColor = '#c9c8c7'
                break
            }
            case 'OP': {
                frontColor = '#FF0000'
                backColor = '#DD0000'
                break
            }
            case 'DINERO': {
                frontColor = '#232b2b'
                backColor = '#232b2b'
                break
            }
            case 'HAI':
            default: {
                frontColor = theme.colors.greenish
                backColor = '#B2E3AD'
                break
            }
        }
        return css`
            & ${Face} {
                background-color: ${frontColor};
            }
            & ${BackFace} {
                background-color: ${backColor};
            }
            & ${InsidePiece} {
                background-color: ${backColor};
            }
        `
    }}
`

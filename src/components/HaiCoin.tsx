import { useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { CenteredFlex } from '~/styles'
import HaiFace from './Icons/HaiFace'

type HaiCoinProps = {
    width?: string,
    style?: object,
    animated?: boolean
}

export function HaiCoin({ width, animated, ...props }: HaiCoinProps) {
    const [animDuration] = useState(2 + 4 * Math.random())
    return (
        <HaiCoinImage
            {...props}
            $width={width}>
			<CoinBackground
                $animated={animated}
                $animDuration={animDuration}>
                <HaiFace filled/>
            </CoinBackground>
            <CoinBackground
                $animated={animated}
                $animDuration={animDuration}>
                <HaiFace filled/>
            </CoinBackground>
        </HaiCoinImage>
    )
}

const rotAnim = keyframes`
    0% { transform: rotateY(0deg); }
    100% { transform: rotateY(360deg); }
`
const rotAnim2 = keyframes`
    0% { transform: rotateY(-180deg); }
    100% { transform: rotateY(180deg); }
`

export const HaiCoinImage = styled(CenteredFlex)<{ $width?: string }>`
    position: absolute;
    width: ${({ $width = 'auto' }) => $width};
    height: ${({ $width = 'auto' }) => $width};
`
const CoinBackground = styled(CenteredFlex)<{
    $animated?: boolean,
    $animDuration: number
}>`
    position: absolute;
    width: 100%;
    height: 100%;
    perspective: 190px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.colors.greenish};
    backface-visibility: hidden;

    &:nth-child(1) {
        transform: translateZ(-5px);
        ${({ $animated, $animDuration }) => $animated && css`animation: ${rotAnim} ${$animDuration.toFixed(2)}s linear infinite;`}
    }
    &:nth-child(2) {
        transform: translateZ(5px) rotateY(-180deg);
        ${({ $animated, $animDuration }) => $animated && css`animation: ${rotAnim2} ${$animDuration.toFixed(2)}s linear infinite;`}
    }

    & svg {
        width: 60%;
        height: 60%;
    }
`
import { useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { CenteredFlex } from '~/styles'
import HaiFace from './Icons/HaiFace'

type HaiCoinProps = {
    width?: string,
    style?: object,
    animated?: boolean
}

export function HaiCoin({ width, animated, ...props }: HaiCoinProps) {
    const [animDuration] = useState(1.5 + 0.75 * Math.random())
    
    return (
        <HaiCoinImage
            {...props}
            $width={width}>
			<Inner $animDur={animDuration}>
                <Face>
                    <HaiFace filled/>
                </Face>
                <BackFace/>
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
`
const Inner = styled(CenteredFlex)<{ $animDur: number }>`
    width: 100%;
    height: 100%;
    perspective: 1000px;
    transform-style: preserve-3d;
    animation: ${rotate} ${({ $animDur }) => $animDur}s ease-in-out infinite alternate;
`
const Face = styled(CenteredFlex)`
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.colors.greenish};
    transform: translateZ(12px);
    z-index: 2;

    & svg {
        width: 70%;
        height: 70%;
    }
`
const BackFace = styled.div`
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: #B2E3AD;
    transform: translateZ(-12px);
    z-index: 1;
`
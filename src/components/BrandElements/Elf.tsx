import { useState } from 'react'
import styled, { css, keyframes } from 'styled-components'

import elf1 from '~/assets/splash/elf-1.png'
import elf2 from '~/assets/splash/elf-2.png'
import elf3 from '~/assets/splash/elf-3.png'
import elf4 from '~/assets/splash/elf-4.png'
import elf5 from '~/assets/splash/elf-5.png'
import elf6 from '~/assets/splash/elf-6.png'

const elves = [
    {
        src: elf1,
        width: 446,
        height: 550,
    },
    {
        src: elf2,
        width: 420,
        height: 476,
    },
    {
        src: elf3,
        width: 400,
        height: 580,
    },
    {
        src: elf4,
        width: 459,
        height: 459,
    },
    {
        src: elf5,
        width: 545,
        height: 545,
    },
    {
        src: elf6,
        width: 400,
        height: 503,
    },
]

type ElfProps = {
    variant: number
    width?: string
    style?: object
    animated?: boolean
}

export function Elf({ variant, width, animated, ...props }: ElfProps) {
    const [animDuration] = useState(6 + 6 * Math.random())
    return (
        <ElfImage
            {...elves[variant % elves.length]}
            alt=""
            {...props}
            $width={width}
            $animated={animated}
            $animDuration={animDuration}
        />
    )
}

const hueAnim = keyframes`
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
`

export const ElfImage = styled.img<{ $width?: string; $animated?: boolean; $animDuration: number }>`
    position: absolute;
    width: ${({ $width = 'auto' }) => $width};
    height: auto;
    pointer-events: none;
    ${({ $animated, $animDuration }) =>
        $animated &&
        css`
            animation: ${hueAnim} ${$animDuration.toFixed(2)}s linear infinite;
        `}
`

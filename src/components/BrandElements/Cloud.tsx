import styled from 'styled-components'

import cloud1 from '~/assets/splash/cloud-1.png'
import cloud2 from '~/assets/splash/cloud-2.png'

const clouds = [
    {
        src: cloud1,
        width: 626,
        height: 627,
    },
    {
        src: cloud2,
        width: 594,
        height: 595,
    },
]

type CloudProps = {
    variant: number
    width?: string
    style?: object
}

export function Cloud({ variant, width, ...props }: CloudProps) {
    return <CloudImage {...clouds[variant % clouds.length]} alt="" {...props} $width={width} />
}

export const CloudImage = styled.img<{ $width?: string }>`
    position: absolute;
    width: ${({ $width = 'auto' }) => $width};
    height: auto;
    pointer-events: none;
`

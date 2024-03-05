import { useEffect, useState } from 'react'

import styled from 'styled-components'
import { FloatingElements, type FloatingElementsProps } from './BrandElements/FloatingElements'
import { CloudImage } from './BrandElements/Cloud'

// MUST have style.top defined, in pixels
const els: FloatingElementsProps = {
    clouds: [
        {
            index: 0,
            width: '160px',
            style: {
                left: '10px',
                top: '160px',
            },
            zIndex: -3,
        },
        {
            index: 1,
            width: '240px',
            style: {
                right: '-100px',
                top: '640px',
            },
            zIndex: -1,
        },
    ],
}

export function ParallaxBackground() {
    const [container, setContainer] = useState<HTMLElement | null>(null)

    useEffect(() => {
        if (!container) return

        // parse top definition for reference in loop
        const tops =
            els.clouds?.map(({ style }) => {
                const top = style?.top?.toString().replace('px', '') || '0'
                return parseInt(top)
            }) || []

        const clouds = Array.from(container.querySelectorAll(CloudImage)) as HTMLElement[]
        const onScroll = () => {
            for (let i = 0; i < clouds.length; i++) {
                const { zIndex = -1 } = els.clouds?.[i] || {}
                // parallax scroll, moving farther objects less than closer ones
                clouds[i].style.top = `${tops[i] - window.scrollY / (1 - zIndex)}px`
            }
        }
        window.addEventListener('scroll', onScroll, { passive: true })

        return () => window.removeEventListener('scroll', onScroll)
    }, [container])

    return (
        <Container ref={setContainer}>
            <FloatingElements {...els} />
        </Container>
    )
}

const Container = styled.div`
    position: fixed;
    inset: 0px;
    pointer-events: none;
    z-index: 0;
`

import { useEffect, useState } from 'react'

import { useStoreActions } from '~/store'

import styled from 'styled-components'
import { CenteredFlex } from '~/styles'
import { ZoomScene } from './Scenes/ZoomScene'
import { Intro } from './Scenes/Intro'
import { Second } from './Scenes/Second'
import { Third } from './Scenes/Third'
import { Fourth } from './Scenes/Fourth'
import { Footer } from './Footer'

export function Splash() {
    const { settingsModel: settingsActions } = useStoreActions((actions) => actions)

    const [container, setContainer] = useState<HTMLElement | null>(null)
    const [zoomContainer, setZoomContainer] = useState<HTMLElement | null>(null)

    useEffect(() => {
        if (!container || !zoomContainer) return

        const onTopLevelScroll = (e: WheelEvent | { deltaY: number }) => {
            // if not at bottom of container let scroll event pass through
            const { height } = container.getBoundingClientRect()
            if (container.scrollTop < container.scrollHeight - height - 10) {
                zoomContainer.style.pointerEvents = 'none'
                return
            }

            // container.style.pointerEvents = e.deltaY > 0 ? 'none': 'all'
            // allow scroll down to footer
            if (e.deltaY >= 0) return

            zoomContainer.style.pointerEvents = 'none'
        }
        zoomContainer.addEventListener('wheel', onTopLevelScroll, { passive: false })

        // mobile hack
        const touch = { x: 0, y: 0 }
        const onTouchMove = (e: TouchEvent) => {
            const delta = {
                x: e.touches[0].clientX - touch.x,
                y: e.touches[0].clientY - touch.y,
            }
            onTopLevelScroll({ deltaY: delta.y })
        }
        const onTouchStart = (e: TouchEvent) => {
            touch.x = e.touches[0].clientX
            touch.y = e.touches[0].clientY
        }
        window.addEventListener('touchstart', onTouchStart)
        window.addEventListener('touchmove', onTouchMove, { passive: true })

        // update 3d scenes
        const scenes = Array.from(zoomContainer.querySelectorAll(ZoomScene)) as HTMLElement[]
        const onScroll = () => {
            zoomContainer.style.pointerEvents = 'none'
            const progress = (300 * container.scrollTop) / window.innerHeight
            if (progress > 900) {
                const offset = (50 * (progress - 900)) / 300
                zoomContainer.style.top = `${-offset}vh`
                zoomContainer.style.bottom = `${offset}vh`
                zoomContainer.style.pointerEvents = 'all'
                settingsActions.setHeaderBgActive(true)
                return
            }
            settingsActions.setHeaderBgActive(false)
            zoomContainer.style.top = '0px'
            zoomContainer.style.bottom = '0px'

            scenes.forEach((scene, i) => {
                const z = -300 * i + progress
                scene.style.transform = `translateZ(${z}px)`
                if (z < 190 && z > -240) scene.style.display = 'flex'
                else scene.style.display = 'none'
                const opacity = z < 0 ? Math.max(0, 1 - -z / 240).toString() : '1'
                Array.from(scene.children).forEach((child) => {
                    ;(child as HTMLElement).style.opacity = opacity
                })
            })
            zoomContainer.style.pointerEvents = 'all'
        }
        onScroll()
        container.addEventListener('scroll', onScroll, { passive: true })

        return () => {
            zoomContainer.removeEventListener('wheel', onTopLevelScroll)
            window.removeEventListener('touchstart', onTouchStart)
            window.removeEventListener('touchmove', onTouchMove)
            container.removeEventListener('scroll', onScroll)
        }
    }, [container, zoomContainer, settingsActions])

    return (
        <Container id="zoom-scroll-container" ref={setContainer}>
            <ZoomContainer ref={setZoomContainer}>
                <Intro zIndex={1000} />
                <Second zIndex={900} />
                <Third zIndex={800} />
                <Fourth zIndex={700} />
            </ZoomContainer>
            {/* scroll targets for scroll snapping */}
            <ScrollTarget />
            <ScrollTarget />
            <ScrollTarget />
            <ScrollTarget />
            <Footer />
        </Container>
    )
}

const Container = styled.div`
    /* height: calc(300vh + 420px); */
    overflow: scroll;
    position: relative;
    width: 100vw;
    height: 100svh;
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
    scroll-snap-stop: always;
    -webkit-overflow-scrolling: touch;
`
const ScrollTarget = styled.div<{ $height?: string }>`
    width: 100%;
    height: ${({ $height = '100svh' }) => $height};
    scroll-snap-align: start;
    pointer-events: none;
    z-index: 2;
`

const ZoomContainer = styled(CenteredFlex)`
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;

    perspective-origin: 50% 50%;
    perspective: 190px;

    overflow: visible;
    z-index: 1;
`

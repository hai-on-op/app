import { useEffect, useState } from 'react'

import styled from 'styled-components'
import { CenteredFlex } from '~/styles'
import { Header } from './Header'
import { ZoomScene } from './Scenes/ZoomScene'
import { Intro } from './Scenes/Intro'
import { Second } from './Scenes/Second'
import { Third } from './Scenes/Third'
import { Footer } from './Footer'

export default function Splash() {
    const [container, setContainer] = useState<HTMLElement>()
    const [zoomContainer, setZoomContainer] = useState<HTMLElement>()

    useEffect(() => {
        if (!container || !zoomContainer) return

        document.body.style.overflow = 'hidden'
        let isScrollingToTop = false
        const onTopLevelScroll = (e: any) => {
            // if not at bottom of container let scroll event pass through
            const { height } = container.getBoundingClientRect()
            if (container.scrollTop < container.scrollHeight - height - 10) {
                zoomContainer.style.pointerEvents = 'none'
                return
            }
            
            container.style.pointerEvents = e.deltaY > 0 ? 'none': 'all'
            // allow scroll down to footer
            if (e.deltaY >= 0) return

            // if not fully scrolled up, scroll up
            if (window.scrollY > 0) {
                if (isScrollingToTop) return
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                })
                isScrollingToTop = true
            }
            else {
                zoomContainer.style.pointerEvents = 'none'
                isScrollingToTop = false
            }
        }
        zoomContainer.addEventListener('wheel', onTopLevelScroll, false)

        // mobile hack
        const touch = { x: 0, y: 0 }
        const onTouchMove = (e: TouchEvent) => {
            const delta = {
                x: e.touches[0].clientX - touch.x,
                y: e.touches[0].clientY - touch.y
            }
            if (Math.abs(delta.y) > 10 && Math.abs(delta.y) > Math.abs(delta.x)) {
                onTopLevelScroll({ deltaY: delta.y })
            }
        }
        const onTouchStart = (e: TouchEvent) => {
            touch.x = e.touches[0].clientX
            touch.y = e.touches[0].clientY
        }
        zoomContainer.addEventListener('touchstart', onTouchStart)
        zoomContainer.addEventListener('touchmove', onTouchMove)

        // update 3d scenes
        const scenes = Array.from(zoomContainer.querySelectorAll(ZoomScene)) as HTMLElement[]
        const onScroll = () => {
            zoomContainer.style.pointerEvents = 'none'
            const progress = 300 * container.scrollTop / window.innerHeight
            if (progress >= 600) Object.assign(document.body.style, { overflow: null })
            else document.body.style.overflow = 'hidden'

            scenes.forEach((scene, i) => {
                const z = -300 * i + progress
                scene.style.transform = `translateZ(${z}px)`
                if (z < 190 && z > -240) scene.style.display = 'flex'
                else scene.style.display = 'none'
                const opacity = z < 0 ? Math.max(0, 1 - (-z / 240)).toString(): '1'
                Array.from(scene.children).forEach(child => { (child as HTMLElement).style.opacity = opacity })
            })
            zoomContainer.style.pointerEvents = 'all'
        }
        onScroll()
        container.addEventListener('scroll', onScroll)

        return () => {
            zoomContainer.removeEventListener('wheel', onTopLevelScroll)
            zoomContainer.removeEventListener('touchstart', onTouchStart)
            zoomContainer.removeEventListener('touchmove', onTouchMove)
            container.removeEventListener('scroll', onScroll)
            Object.assign(document.body.style, { overflow: null })
        }
    }, [container, zoomContainer])

    return (<>
        <Background>
            <video
                src="/assets/tie-dye-reduced.mov"
                width={1920}
                height={1072}
                muted
				autoPlay
				playsInline
                loop
            />
        </Background>
        <Header/>
        <ZoomContainer ref={setZoomContainer as any}>
            <Intro zIndex={1000}/>
            <Second zIndex={900}/>
            <Third zIndex={800}/>
        </ZoomContainer>
        <Container ref={setContainer as any}>
            {/* scroll targets for scroll snapping */}
            <ScrollTarget/>
            <ScrollTarget/>
            <ScrollTarget/>
            {/* <ScrollTarget $height="200vh"/> */}
        </Container>
        <Footer/>
    </>)
}

const Background = styled(CenteredFlex)`
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;
    background-color: white;

    & video {
        min-width: 100%;
        min-height: 100%;
        object-fit: cover;
        opacity: 0.5;
    }

    z-index: 0;
`

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
    position: absolute;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;

    perspective-origin: 50% 50%;
    perspective: 190px;

    overflow: visible;
    z-index: 1;
`

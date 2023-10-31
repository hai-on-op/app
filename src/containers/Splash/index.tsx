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
    const [zoomContainer, setZoomContainer] = useState<HTMLElement>()

    useEffect(() => {
        if (!zoomContainer) return

        const scenes = Array.from(zoomContainer.querySelectorAll(ZoomScene)) as HTMLElement[]
        const onScroll = () => {
            const progress = 300 * window.scrollY / window.innerHeight

            scenes.forEach((scene, i) => {
                const z = -300 * i + progress
                scene.style.transform = `translateZ(${z}px)`
                if (z < 190 && z > -240) scene.style.display = 'flex'
                else scene.style.display = 'none'
                const opacity = z < 0 ? Math.max(0, 1 - (-z / 240)).toString(): '1'
                Array.from(scene.children).forEach(child => { (child as HTMLElement).style.opacity = opacity })
            })
        }
        onScroll()
        window.addEventListener('scroll', onScroll)

        return () => window.removeEventListener('scroll', onScroll)
    }, [zoomContainer])

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
        {/* scroll targets for scroll snapping */}
        <ScrollTarget/>
        <ScrollTarget $top="100vh"/>
        <ScrollTarget $top="200vh"/>
        {/* <ScrollTarget $top="300vh"/> */}
        <ScrollTarget $top="calc(300vh + 420px)"/>
        <Container>
            <ZoomContainer ref={setZoomContainer as any}>
                <Intro zIndex={1000}/>
                <Second zIndex={900}/>
                <Third zIndex={800}/>
            </ZoomContainer>
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
    height: calc(300vh + 420px);
`
const ScrollTarget = styled.div<{ $top?: number | string }>`
    position: absolute;
    width: 100%;
    height: 1px;
    scroll-snap-align: start;
    top: ${({ $top = '0px' }) => (typeof $top === 'string' ? $top: `${$top}px`)};
`

const ZoomContainer = styled(CenteredFlex)`
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;

    perspective-origin: 50% 50%;
    perspective: 190px;

    overflow: hidden;
`

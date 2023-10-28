import { useEffect, useState } from 'react'

import { clamp } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex } from '~/styles'
import { Header } from './Header'
import { Elf, ElfImage } from '~/components/Elf'
import { Cloud, CloudImage } from '~/components/Cloud'
import { HaiCoin, HaiCoinImage } from '~/components/HaiCoin'
import { type SplashImage, ZoomScene } from './Scenes/ZoomScene'
import { Intro, introClouds, introCoins, introElves } from './Scenes/Intro'
import { Second, secondClouds, secondCoins, secondElves } from './Scenes/Second'
import { Third, thirdClouds, thirdElves } from './Scenes/Third'
import { Footer } from './Footer'

function build3dElementDetails(...arr: SplashImage[][]) {
    return arr.reduce((temp, details, i) => {
        return [
            ...temp,
            ...details.map((el: any) => ({
                ...el,
                position: [
                    el.position[0],
                    el.position[1],
                    -300 * i + el.position[2]
                ] as [string, string, number],
                zIndex: 1000 - (100 * i) + (el.deltaZ || 0)
            }))
        ]
    }, [] as SplashImage[])
}

const elves = build3dElementDetails(introElves, secondElves, thirdElves)

const clouds = build3dElementDetails(introClouds, secondClouds, thirdClouds)

const coins = build3dElementDetails(introCoins, secondCoins)

const update3dElement = (
    el: HTMLElement,
    transform: Pick<SplashImage, 'position' | 'rotation' | 'flip'>,
    z: number
) => {
    el.style.transform = `translate(${transform.position[0]}, ${transform.position[1]}) translateZ(${z}px) rotate(${transform.rotation || 0}deg)${transform.flip ? ' scaleX(-1)': ''}`

    if (z < 190 && z > -240) {
        el.style.display = 'flex'
        el.style.opacity = clamp(1 + (z + 80) / 160, 0, 1).toString()
    }
    else el.style.display = 'none'
}

export default function Splash() {
    const [zoomContainer, setZoomContainer] = useState<HTMLElement>()

    useEffect(() => {
        if (!zoomContainer) return

        const scenes = Array.from(zoomContainer.querySelectorAll(ZoomScene)) as HTMLElement[]
        const elfImages = Array.from(zoomContainer.querySelectorAll(ElfImage)) as HTMLElement[]
        const cloudImages = Array.from(zoomContainer.querySelectorAll(CloudImage)) as HTMLElement[]
        const coinImages = Array.from(zoomContainer.querySelectorAll(HaiCoinImage)) as HTMLElement[]
        const onScroll = () => {
            const progress = 300 * window.scrollY / window.innerHeight

            scenes.forEach((scene, i) => {
                const z = -300 * i + progress
                scene.style.transform = `translateZ(${z}px)`
                if (z < 190 && z > -240) scene.style.display = 'flex'
                else scene.style.display = 'none'
                if (z < 0) {
                    scene.style.opacity = Math.max(0, 1 - (-z / 240)).toString()
                }
            })
            elfImages.forEach((elf, i) => {
                const selectedElf = elves[i]
                const z = selectedElf.position[2] + progress
                update3dElement(elf, selectedElf, z)
            })
            cloudImages.forEach((cloud, i) => {
                const selectedCloud = clouds[i]
                const z = selectedCloud.position[2] + progress
                update3dElement(cloud, selectedCloud, z)
            })
            coinImages.forEach((coin, i) => {
                const selectedCoin = coins[i]
                const z = selectedCoin.position[2] + progress
                update3dElement(coin, selectedCoin, z)
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
                {clouds.map(({ index, width, position, rotation = 0, flip, zIndex }, i) => (
                    <Cloud
                        key={i}
                        variant={index}
                        width={width}
                        style={{
                            transform: `translate(${position[0]}, ${position[1]}) translateZ(${position[2]}px) rotate(${rotation}deg)${flip ? ' scaleX(-1)': ''}`,
                            zIndex
                        }}
                    />
                ))}
                {elves.map(({ index, width, position, rotation = 0, zIndex }, i) => (
                    <Elf
                        key={i}
                        variant={index}
                        width={width}
                        animated
                        style={{
                            transform: `translate(${position[0]}, ${position[1]}) translateZ(${position[2]}px) rotate(${rotation}deg)`,
                            zIndex
                        }}
                    />
                ))}
                {coins.map(({ index, width, position, rotation = 0, zIndex }, i) => (
                    <HaiCoin
                        key={i}
                        variant={index === 0 ? 'hai': 'kite'}
                        width={width}
                        animated
                        style={{
                            transform: `translate(${position[0]}, ${position[1]}) translateZ(${position[2]}px) rotate(${rotation}deg)`,
                            zIndex
                        }}
                    />
                ))}
                <Intro style={{ zIndex: 1000 }}/>
                <Second style={{ zIndex: 900 }}/>
                <Third style={{ zIndex: 800 }}/>
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
    height: 0px;
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

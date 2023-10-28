import { useEffect, useState } from 'react'

import { clamp } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex } from '~/styles'
import { Header } from './Header'
import { Elf, ElfImage } from '~/components/Elf'
import { Cloud, CloudImage } from '~/components/Cloud'
import { HaiCoin, HaiCoinImage } from '~/components/HaiCoin'
import { ZoomScene } from './Scenes/ZoomScene'
import { Intro } from './Scenes/Intro'
import { Second } from './Scenes/Second'
import { Third } from './Scenes/Third'

type SplashImage = {
    index: number
    width: string,
    position: [ string, string, number ],
    rotation?: number,
    flip?: boolean,
    zIndex?: number
}

const elves: SplashImage[] = [
    // Intro
    {
        index: 0,
        width: '240px',
        position: ['340px', '70px', 40],
        zIndex: 1001
    },
    {
        index: 1,
        width: '140px',
        position: ['210px', '-320px', -20],
        zIndex: 999
    },
    {
        index: 2,
        width: '300px',
        position: ['-480px', '-100px', 20],
        rotation: 30,
        zIndex: 1002
    },
    // Second
    {
        index: 1,
        width: '200px',
        position: ['100px', '-240px', -280],
        zIndex: 901
    },
    // Third
    {
        index: 3,
        width: '240px',
        position: ['30vw', '-200px', -580],
        rotation: 20,
        zIndex: 801
    },
    {
        index: 4,
        width: '200px',
        position: ['-40vw', '36vh', -580],
        rotation: -20,
        zIndex: 801
    }
]

const clouds: SplashImage[] = [
    // Intro
    {
        index: 0,
        width: '240px',
        position: ['-320px', '-240px', -40],
        zIndex: 995
    },
    {
        index: 0,
        width: '240px',
        position: ['540px', '-100px', -40],
        flip: true,
        zIndex: 995
    },
    {
        index: 0,
        width: '200px',
        position: ['100px', '240px', -80],
        flip: true,
        zIndex: 990
    },
    // Second
    {
        index: 0,
        width: '340px',
        position: ['-510px', '240px', -280],
        zIndex: 903
    },
    {
        index: 1,
        width: '190px',
        position: ['510px', '220px', -280],
        zIndex: 903
    },
    // Third
    {
        index: 0,
        width: '280px',
        position: ['-36vw', '-200px', -580],
        zIndex: 798
    },
    {
        index: 1,
        width: '220px',
        position: ['40vw', '320px', -620],
        zIndex: 801
    }
]

const coins: Omit<SplashImage, 'index'>[] = [
    {
        width: '180px',
        position: ['180px', '120px', 0],
        rotation: -30,
        zIndex: 1001
    },
    {
        width: '140px',
        position: ['410px', '-60px', -40],
        rotation: 30,
        zIndex: 996
    },
    {
        width: '100px',
        position: ['560px', '-340px', -80],
        rotation: 0,
        zIndex: 993
    }
]

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
        <ScrollTarget $top="300vh"/>
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
                {coins.map(({ width, position, rotation = 0, zIndex }, i) => (
                    <HaiCoin
                        key={i}
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
    height: 1000vh;
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

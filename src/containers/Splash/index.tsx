import { useEffect, useState } from 'react'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { Header } from './Header'
import { PairsBanner } from './PairsBanner'
import { Elf, ElfImage } from '~/components/Elf'

type SplashImage = {
    index: number
    width: string,
    position: [ string, string, number ],
    rotation?: number
}

const elves: SplashImage[] = [
    {
        index: 0,
        width: '240px',
        position: [ '300px', '90px', 40 ],
        rotation: 0
    },
    {
        index: 1,
        width: '140px',
        position: [ '210px', '-320px', -20 ],
        rotation: 0
    },
    {
        index: 2,
        width: '300px',
        position: [ '-480px', '-100px', 20 ],
        rotation: 30
    }
]

export default function Splash() {
    const [zoomContainer, setZoomContainer] = useState<HTMLElement>()

    useEffect(() => {
        if (!zoomContainer) return

        const scenes = Array.from(zoomContainer.querySelectorAll(ZoomScene)) as HTMLElement[]
        const elfImages = Array.from(zoomContainer.querySelectorAll(ElfImage)) as HTMLElement[]
        const onScroll = () => {
            scenes.forEach((scene, i) => {
                const z = -300 * i + 2 * window.scrollY
                scene.style.transform = `translateZ(${z}px)`
                if (z < 190 && z > -240) scene.style.display = 'flex'
                else scene.style.display = 'none'
                if (z < 0) {
                    scene.style.opacity = Math.max(0, 1 - (-z / 240)).toString()
                }
            })
            elfImages.forEach((elf, i) => {
                const selectedElf = elves[i]
                const z = selectedElf.position[2] + 2 * window.scrollY
                elf.style.transform = `translate(${selectedElf.position[0]}, ${selectedElf.position[1]}) translateZ(${z}px) rotate(${selectedElf.rotation || 0}deg)`
                if (z < 190 && z > -240) elf.style.display = 'flex'
                else elf.style.display = 'none'
                if (z < 0) {
                    elf.style.opacity = Math.max(0, 1 - (-z / 240)).toString()
                }
            })
        }
        onScroll()
        window.addEventListener('scroll', onScroll)

        return () => window.removeEventListener('scroll', onScroll)
    }, [zoomContainer])

    return (<>
        <Background>
            <video
                src="/assets/tie-dye.MOV"
                width={1920}
                height={1072}
                muted
				autoPlay
				playsInline
                loop
            />
        </Background>
        <Header/>
        <Container>
            <ZoomContainer ref={setZoomContainer as any}>
                <ZoomScene>
                    <Flex
                        $column
                        $justify="center"
                        $align="flex-start"
                        $gap={48}
                        style={{ maxWidth: '900px' }}>
                        <BrandedTitle
                            textContent="GET $HAI ON YOUR OWN SUPPLY."
                            $fontSize="6rem"
                            $letterSpacing="1.2rem"
                        />
                        <HaiButton $variant="yellowish">
                            SCROLL TO EXPLORE
                        </HaiButton>
                    </Flex>
                    <PairsBanner/>
                </ZoomScene>
                <ZoomScene>
                    <CenteredFlex
                        $column
                        $gap={48}>
                        <BrandedTitle textContent="GET $HAI ON YOUR OWN SUPPLY"/>
                        <HaiButton $variant="yellowish">
                            SCROLL TO EXPLORE
                        </HaiButton>
                    </CenteredFlex>
                </ZoomScene>
                <ZoomScene>
                    <CenteredFlex
                        $column
                        $gap={48}>
                        <BrandedTitle textContent="GET $HAI ON YOUR OWN SUPPLY"/>
                        <HaiButton $variant="yellowish">
                            SCROLL TO EXPLORE
                        </HaiButton>
                    </CenteredFlex>
                </ZoomScene>
                {elves.map(({ index, width, position, rotation }, i) => (
                    <Elf
                        key={i}
                        variant={index}
                        width={width}
                        animated
                        style={{
                            transform: `translate(${position[0]}, ${position[1]}) translateZ(${position[2]}px) rotate(${rotation}deg)`
                        }}
                    />
                ))}
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

const ZoomScene = styled(CenteredFlex)`
    position: absolute;
    width: 100%;
    height: 100%;
`

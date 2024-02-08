import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { ZoomScene, type ZoomSceneProps } from './ZoomScene'
import { BrandedTitle } from '~/components/BrandedTitle'
import { Swirl } from '~/components/Icons/Swirl'
import { PairsBanner } from '../PairsBanner'
import { FloatingElements, type FloatingElementsProps } from '~/components/BrandElements/FloatingElements'

const elves: FloatingElementsProps['elves'] = [
    {
        index: 0,
        width: 'min(240px, 30vw)',
        style: {
            right: '0px',
            bottom: '-9vh',
        },
        zIndex: 2,
    },
    {
        index: 1,
        width: '140px',
        style: {
            right: '15vw',
            top: '-180px',
        },
        rotation: -30,
        zIndex: -1,
    },
    {
        index: 2,
        width: '240px',
        style: {
            left: '-280px',
            top: '-20px',
        },
        rotation: 18,
        flip: true,
        zIndex: -1,
    },
]

const clouds: FloatingElementsProps['clouds'] = [
    {
        index: 0,
        width: '220px',
        style: {
            left: '100px',
            top: '-140px',
        },
        zIndex: -1,
    },
    {
        index: 0,
        width: '240px',
        style: {
            right: '-240px',
            bottom: '60px',
        },
        flip: true,
        zIndex: -2,
    },
    {
        index: 0,
        width: '200px',
        style: {
            right: '25%',
            bottom: '-160px',
        },
        flip: true,
        zIndex: -4,
    },
]

const coins: FloatingElementsProps['coins'] = [
    {
        index: 'HAI',
        width: 'min(150px, 25vw)',
        style: {
            right: '12vw',
            bottom: '-60px',
        },
        rotation: -30,
        zIndex: 1,
    },
    {
        index: 'HAI',
        width: '130px',
        style: {
            right: '-40px',
            bottom: '120px',
        },
        rotation: 30,
        zIndex: -2,
    },
    {
        index: 'HAI',
        width: '100px',
        thickness: 9,
        style: {
            right: '-100px',
            top: '-150px',
        },
        rotation: 0,
        zIndex: -4,
    },
]

export function Intro({ zIndex }: ZoomSceneProps) {
    const isLargerThanExtraSmall = useMediaQuery('upToExtraSmall')
    const isLargerThanSmall = useMediaQuery('upToSmall')

    return (
        <ZoomScene $zIndex={zIndex} style={{ width: '100%', height: '100%' }}>
            <Container>
                <BrandedTitle
                    textContent="GET $HAI ON YOUR OWN SUPPLY."
                    $fontSize={isLargerThanSmall ? '6rem' : isLargerThanExtraSmall ? '3.6rem' : '3rem'}
                    $letterSpacing={isLargerThanSmall ? '1.2rem' : isLargerThanExtraSmall ? '0.8rem' : '0.5rem'}
                />
                <Text $lineHeight="1.6">
                    The <strong>multi-collateral stablecoin</strong> for smooth financial highs.
                </Text>
                <HaiButton $variant="yellowish">
                    <Swirl />
                    Scroll To Explore
                </HaiButton>
                {/*
                Note: FloatingElements MUST be a direct child of ZoomScene
                EXCEPT in this top-level scene as the opacity calculations of
                the lower scenes will remove the transform-style: preserve-3d,
                flattening the scene (removing the parallax effect on scroll)
                */}
                <FloatingElements elves={elves} clouds={clouds} coins={coins} />
            </Container>
            <PairsBanner />
        </ZoomScene>
    )
}

const Container = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'center',
    $align: 'flex-start',
    $gap: 48,
    ...props,
}))`
    position: relative;
    max-width: min(900px, calc(100vw - 48px));
    /* again, this only works in this scene becuase
    the opacity of this container will not change */
    transform-style: preserve-3d;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        gap: 24px;
    `}
`

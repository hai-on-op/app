import styled from 'styled-components'
import { Flex, HaiButton } from '~/styles'
import { type SplashImage, ZoomScene } from './ZoomScene'
import { BrandedTitle } from '~/components/BrandedTitle'
import Swirl from '~/components/Icons/Swirl'
import { PairsBanner } from '../PairsBanner'

export const introElves: SplashImage[] = [
    {
        index: 0,
        width: '240px',
        position: ['340px', '70px', 40],
        deltaZ: 2
    },
    {
        index: 1,
        width: '140px',
        position: ['210px', '-320px', -20],
        deltaZ: -1
    },
    {
        index: 2,
        width: '300px',
        position: ['-480px', '-100px', 20],
        rotation: 30,
        deltaZ: 1
    }
]

export const introClouds: SplashImage[] = [
    {
        index: 0,
        width: '240px',
        position: ['-320px', '-240px', -40],
        deltaZ: -2
    },
    {
        index: 0,
        width: '240px',
        position: ['540px', '-100px', -40],
        flip: true,
        deltaZ: -2
    },
    {
        index: 0,
        width: '200px',
        position: ['100px', '240px', -80],
        flip: true,
        deltaZ: -4
    }
]

export const introCoins: SplashImage[] = [
    {
        index: 0,
        width: '180px',
        position: ['180px', '120px', 0],
        rotation: -30,
        zIndex: 1001
    },
    {
        index: 0,
        width: '140px',
        position: ['410px', '-60px', -40],
        rotation: 30,
        zIndex: 996
    },
    {
        index: 0,
        width: '100px',
        position: ['560px', '-340px', -80],
        rotation: 0,
        zIndex: 993
    }
]

export function Intro({ ...props }) {
    return (
        <ZoomScene {...props}>
            <Container>
                <BrandedTitle
                    textContent="GET $HAI ON YOUR OWN SUPPLY."
                    $fontSize="6rem"
                    $letterSpacing="1.2rem"
                />
                <HaiButton $variant="yellowish">
                    <Swirl/>
                    SCROLL TO EXPLORE
                </HaiButton>
            </Container>
            <PairsBanner/>
        </ZoomScene>
    )
}

const Container = styled(Flex).attrs(props => ({
    $column: true,
    $justify: 'center',
    $align: 'flex-start',
    $gap: 48,
    ...props
}))`
    max-width: 900px;
`
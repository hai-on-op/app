import { useState } from 'react'

import type { SplashImage } from '~/types'
import { LINK_TO_DOCS } from '~/utils'
import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { Flex, HaiButton } from '~/styles'
import { ZoomScene, type ZoomSceneProps } from './ZoomScene'
import { FloatingElements } from '~/components/BrandElements/FloatingElements'
import { Caret } from '~/components/Icons/Caret'
import { LearnCard } from './LearnCard'

const elves: SplashImage[] = [
    {
        index: 3,
        width: 'min(210px, 40vw)',
        style: {
            right: '6vw',
            top: '-80px',
        },
        rotation: 20,
        zIndex: 1,
    },
    {
        index: 4,
        width: 'min(200px, 45vw)',
        style: {
            left: '-10px',
            bottom: '-80px',
        },
        rotation: -20,
        zIndex: 1,
    },
]

const clouds: SplashImage[] = [
    {
        index: 0,
        width: 'min(280px, 50vw)',
        style: {
            left: 'max(-160px, -25vw)',
            top: 'max(-190px, -35vw)',
        },
        zIndex: -2,
    },
    {
        index: 1,
        width: 'min(220px, 42vw)',
        style: {
            right: '14vw',
            bottom: '-80px',
        },
        zIndex: 1,
    },
]

const cardTitles = [
    {
        title: 'BORROW HAI TO MULTIPLY YOUR CRYPTO EXPOSURE',
        link: `${LINK_TO_DOCS}detailed/modules/safe_engine.html`,
    },
    {
        title: 'EARN KITE AND OP WHILE GETTING HAI',
        link: `${LINK_TO_DOCS}detailed/proxies/actions/rewarded_actions.html`,
    },
    {
        title: 'FARM REWARDS BY PROVIDING LIQUIDITY',
        link: `${LINK_TO_DOCS}detailed/intro/hai.html`,
    },
]

const CARDS_WIDTH = 424 * cardTitles.length + 72

export function Fourth({ zIndex }: ZoomSceneProps) {
    const isLargerThanWidth = useMediaQuery(`(min-width: ${CARDS_WIDTH}px)`)

    const [index, setIndex] = useState(0)

    return (
        <ZoomScene $zIndex={zIndex} style={{ marginTop: '100px' }}>
            <Container
                $offset={
                    isLargerThanWidth
                        ? 'calc(0px)'
                        : `max(calc(${-100 * index}vw + ${36 * index}px), ${-424 * index}px)`
                }
            >
                {cardTitles.map(({ title, link }, i) => (
                    <LearnCard key={i} title={title} link={link} />
                ))}
                <ArrowButton onClick={() => setIndex((i) => (i <= 0 ? cardTitles.length - 1 : i - 1))}>
                    <Caret direction="left" />
                </ArrowButton>
                <ArrowButton onClick={() => setIndex((i) => (i >= cardTitles.length - 1 ? 0 : i + 1))}>
                    <Caret direction="right" />
                </ArrowButton>
            </Container>
            <FloatingElements elves={elves} clouds={clouds} />
        </ZoomScene>
    )
}

const Container = styled(Flex).attrs((props) => ({
    $justify: 'flex-start',
    $align: 'center',
    ...props,
}))<{ $offset: string }>`
    position: relative;
    width: ${CARDS_WIDTH}px;
    max-width: 100vw;
    padding: 12px 48px;
    gap: 24px;
    overflow: hidden;

    & > *:first-child {
        margin-left: ${({ $offset }) => $offset};
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        width: 100vw;
        padding: 12px 36px;
        gap: 36px;
    `}
`

const ArrowButton = styled(HaiButton).attrs((props) => ({
    $variant: 'yellowish',
    ...props,
}))`
    position: absolute;
    width: 48px;
    height: 48px;
    padding: 0px;
    justify-content: center;
    left: 24px;

    &:last-of-type {
        left: auto;
        right: 24px;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        left: 12px;
        &:last-of-type {
            left: auto;
            right: 12px;
        }
    `}

    @media(min-width: ${CARDS_WIDTH}px) {
        display: none;
    }
`

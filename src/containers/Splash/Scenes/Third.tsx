import { useState } from 'react'

import { LINK_TO_DOCS } from '~/utils'
import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { Flex, HaiButton, Text } from '~/styles'
import { type SplashImage, ZoomScene, type ZoomSceneProps } from './ZoomScene'
import { FloatingElements } from './FloatingElements'
import Caret from '~/components/Icons/Caret'
import { LearnCard } from './LearnCard'

const elves: SplashImage[] = [
    {
        index: 3,
        width: 'min(210px, 40vw)',
        style: {
            right: '6vw',
            top: '-80px'
        },
        rotation: 20,
        zIndex: 1
    },
    {
        index: 4,
        width: 'min(200px, 45vw)',
        style: {
            left: '-10px',
            bottom: '-80px'
        },
        rotation: -20,
        zIndex: 1
    }
]

const clouds: SplashImage[] = [
    {
        index: 0,
        width: 'min(280px, 50vw)',
        style: {
            left: 'max(-160px, -25vw)',
            top: 'max(-190px, -35vw)'
        },
        zIndex: -2
    },
    {
        index: 1,
        width: 'min(220px, 42vw)',
        style: {
            right: '14vw',
            bottom: '-80px'
        },
        zIndex: 1
    }
]

const cardTitles = [
    {
        title: 'MINT',
        content: 'Borrow HAI against your crypto bags',
        link: LINK_TO_DOCS
    },
    {
        title: 'EARN',
        content: 'Get HAI, earn rewards',
        link: LINK_TO_DOCS
    },
    {
        title: 'FARM',
        content: 'Provide HAI or KITE liquidity for rewards',
        link: LINK_TO_DOCS
    }
]

export function Third({ zIndex }: ZoomSceneProps) {
    const isLargerThanWidth = useMediaQuery('(min-width: 1344px)')

    const [index, setIndex] = useState(0)

    return (
        <ZoomScene
            $zIndex={zIndex}
            style={{ marginTop: '100px' }}>
            <Container $offset={isLargerThanWidth
                ? 'calc(0px)'
                : `max(calc(${-100 * index}vw + ${24 * index}px), ${-424 * index}px)`
            }>
                {cardTitles.map(({ title, content, link }, i) => (
                    <LearnCard
                        key={i}
                        title={title}
                        content={content}
                        link={link}
                    />
                ))}
                <ArrowButton onClick={() => setIndex(i => i <= 0 ? cardTitles.length - 1: i - 1)}>
                    <Caret style={{ transform: 'rotate(180deg)' }}/>
                </ArrowButton>
                <ArrowButton onClick={() => setIndex(i => i >= cardTitles.length - 1 ? 0: i + 1)}>
                    <Caret/>
                </ArrowButton>
            </Container>
            <FloatingElements
                elves={elves}
                clouds={clouds}
            />
        </ZoomScene>
    )
}

const Container = styled(Flex).attrs(props => ({
    $justify: 'flex-start',
    $align: 'center',
    $gap: 24,
    ...props
}))<{ $offset: string }>`
    position: relative;
    width: ${cardTitles.length * 424 + 96}px;
    max-width: 100vw;
    padding: 12px 48px;
    overflow: hidden;

    & > *:first-child {
        margin-left: ${({ $offset }) => $offset};
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        width: 100vw;
        padding: 12px 24px;
    `}
`

const ArrowButton = styled(HaiButton).attrs(props => ({
    $variant: 'yellowish',
    ...props
}))`
    position: absolute;
    width: 48px;
    height: 48px;
    left: 24px;

    &:last-of-type {
        left: auto;
        right: 24px;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        left: 0px;
        &:last-of-type {
            left: auto;
            right: 0px;
        }
    `}

    @media(min-width: 1344px) {
        display: none;
    }
`

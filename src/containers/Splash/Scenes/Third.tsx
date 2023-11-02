import { useState } from 'react'

import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { type SplashImage, ZoomScene, type ZoomSceneProps } from './ZoomScene'
import { BrandedTitle } from '~/components/BrandedTitle'
import RightArrow from '~/components/Icons/RightArrow'
import { FloatingElements } from './FloatingElements'
import Caret from '~/components/Icons/Caret'

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
    'BORROW HAI TO MULTIPLY YOUR CRYPTO EXPOSURE',
    'COLLECT MONTHLY REWARDS FOR PROVIDING LIQUIDITY',
    'ACQUIRE LIQUIDATED ASSETS'
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
                {cardTitles.map((title, i) => (
                    <LearnCard
                        key={i}
                        title={title}
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

const LearnCardContainer = styled(Flex).attrs(props => ({
    $column: true,
    $justify: 'space-between',
    $align: 'flex-start',
    $shrink: 0,
    ...props
}))`
    position: relative;
    width: min(calc(100vw - 48px), 400px);
    height: 500px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    /* background-color: #f1f1fb77; */
    /* backdrop-filter: blur(13px); */
    background-color: rgba(255,255,255,0.4);
    padding: 48px;
    transition: all 0.5s ease;

    & svg {
        width: auto;
        height: 1rem;
    }

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 36px;
        height: max(400px, min(420px, 65vh));
    `}
`

function LearnCard({ title }: { title: string }) {
    const isLargerThanExtraSmall = useMediaQuery('upToExtraSmall')

    return (
        <LearnCardContainer>
            <BrandedTitle
                textContent={title}
                $fontSize={isLargerThanExtraSmall ? '2.5rem': '2rem'}
                $lineHeight="1.25"
            />
            <CenteredFlex
                $gap={12}
                style={{ cursor: 'pointer' }}>
                <Text
                    $fontSize={isLargerThanExtraSmall ? '1.2rem': '1rem'}
                    $fontWeight={700}
                    $letterSpacing="0.35rem">
                    LEARN MORE
                </Text>
                <RightArrow/>
            </CenteredFlex>
        </LearnCardContainer>
    )
}
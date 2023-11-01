import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'
import { type SplashImage, ZoomScene, type ZoomSceneProps } from './ZoomScene'
import { BrandedTitle } from '~/components/BrandedTitle'
import RightArrow from '~/components/Icons/RightArrow'
import { FloatingElements } from './FloatingElements'

const elves: SplashImage[] = [
    {
        index: 3,
        width: 'min(230px, 50vw)',
        style: {
            right: '6vw',
            top: '-80px'
        },
        rotation: 20,
        zIndex: 1
    },
    {
        index: 4,
        width: '200px',
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
        width: '280px',
        style: {
            left: '-160px',
            top: '-190px'
        },
        zIndex: -2
    },
    {
        index: 1,
        width: 'min(220px, 50vw)',
        style: {
            right: '14vw',
            bottom: '-60px'
        },
        zIndex: 1
    }
]

export function Third({ zIndex }: ZoomSceneProps) {
    return (
        <ZoomScene
            $zIndex={zIndex}
            style={{ marginTop: '100px' }}>
            <Container>
                <LearnCard title="BORROW HAI TO MULTIPLY YOUR CRYPTO EXPOSURE"/>
                <LearnCard title="COLLECT MONTHLY REWARDS FOR PROVIDING LIQUIDITY"/>
                <LearnCard title="ACQUIRE LIQUIDATED ASSETS"/>
                {/* <LearnCard title="BORROW HAI TO MULTIPLY YOUR CRYPTO EXPOSURE"/> */}
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
}))`
    max-width: 100vw;
    padding: 12px 48px;
    overflow: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 12px 24px;
    `}
`

const LearnCardContainer = styled(Flex).attrs(props => ({
    $column: true,
    $justify: 'space-between',
    $align: 'flex-start',
    $shrink: 0,
    ...props
}))`
    width: min(calc(100vw - 48px), 400px);
    height: 500px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    /* background-color: #f1f1fb77; */
    /* backdrop-filter: blur(13px); */
    background-color: rgba(255,255,255,0.4);
    padding: 48px;
    scroll-snap-align: center;

    & svg {
        width: auto;
        height: 1rem;
    }

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 36px;
        height: 420px;
    `}
`

function LearnCard({ title }: { title: string }) {
    const isLargerThanExtraSmall = useMediaQuery('upToExtraSmall')

    return (
        <LearnCardContainer>
            <BrandedTitle
                textContent={title}
                $fontSize={isLargerThanExtraSmall ? '2.5rem': '2rem'}
                $lineHeight="3.6rem"
            />
            <CenteredFlex
                $gap={12}
                style={{ cursor: 'pointer' }}>
                <Text
                    $fontSize="1.2rem"
                    $fontWeight={700}
                    $letterSpacing="0.35rem">
                    LEARN MORE
                </Text>
                <RightArrow/>
            </CenteredFlex>
        </LearnCardContainer>
    )
}
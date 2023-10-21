import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styled from 'styled-components'

import { type ButtonProps, ButtonStyle, poppins, Flex, Grid, CenteredFlex, Text } from '@/styles'

const options = ['OPTIMISM', 'ETHEREUM', 'LSDs', 'UNISWAP', '???']

export default function Splash() {
    const [title, setTitle] = useState(options[0])

    useEffect(() => {
        let currentIndex = 0

        const interval = setInterval(() => {
            currentIndex = (currentIndex + 1) % options.length
            setTitle(options[currentIndex])
        }, 2000)

        return () => clearInterval(interval)
    }, [])

    return (
        <Container>
            <SplashGrid>
                <LaunchContainer>
                    <Flex
                        $column
                        $justify="center"
                        $align="flex-start"
                        $gap="1.75rem">
                        <LaunchTitle>GET HAI ON</LaunchTitle>
                        <LaunchSubtitle>{title}</LaunchSubtitle>
                        <Link href="/safes">
                            <LaunchButton>LAUNCH APP</LaunchButton>
                        </Link>
                    </Flex>
                </LaunchContainer>
                <IconContainer>
                    <Image src="/assets/splash/partly-cloudy.svg" alt="" width={317} height={233} />
                </IconContainer>
            </SplashGrid>
            <Section
                $bg="var(--hai-orange)"
                $padding="4rem 2rem">
                <Text
                    as="h1"
                    $color="white"
                    $textAlign="center"
                    $fontSize="3rem"
                    $fontWeight="normal">
                    HAI is a multi-collateral controlled-peg stable asset that puts decentralization first
                </Text>
            </Section>
            <Section>
                <BorrowGrid>
                    <Text
                        as="h1"
                        $color="black"
                        $fontSize="1.875rem"
                        $lineHeight="2.25rem"
                        $fontWeight="normal"
                        $textAlign="center">
                        Borrow HAI against ETH, Liquid Staked ETH, and OP
                    </Text>
                </BorrowGrid>
            </Section>
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    ...props
}))`
    background-color: white;
`

const SplashGrid = styled(Grid)`
    grid-template-columns: 1fr;
    grid-template-rows: 160px 1fr;
    height: 100vh;

    @media (min-width: 1024px) {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr;
    }
`
const LaunchContainer = styled(CenteredFlex).attrs(props => ({
    $width: '100%',
    $column: true,
    ...props
}))`
    background-color: white;
`
const LaunchTitle = styled.h1`
    font-family: ${poppins.style.fontFamily};
    font-size: 4.5rem;
    font-weight: 600;
    color: var(--hai-orange);
`
const LaunchSubtitle = styled.h1`
    color: black;
    font-weight: normal;
    font-size: 3.75rem;
`
const LaunchButton = styled.button<ButtonProps>`
    ${ButtonStyle}
    border-radius: 1rem;
    background-color: var(--hai-orange);
    color: white;
    font-size: 1.125rem;
    line-height: 1.75rem;
    padding: 0.625rem 3.5rem;
`
const IconContainer = styled(CenteredFlex).attrs(props => ({
    $width: '100%',
    ...props
}))`
    order: -1;
    background-color: var(--hai-skyblue);

    & > img {
        width: 96px;
        height: 96px;
    }

    @media (min-width: 1024px) {
        height: 100%;
        order: unset;

        & > img {
            width: 192px;
            height: 192px;
        }
    }
`

const Section = styled.section<{ $bg?: string, $padding?: string }>`
    min-height: 360px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: ${({ $padding = '0rem 0.5rem' }) => $padding};
    gap: 2rem;

    & > ${Text} {
        max-width: 48rem;
    }
    background-color: ${({ $bg = 'white' }) => $bg};
`

const BorrowGrid = styled(Grid)`
    grid-template-columns: 1fr;

    & > ${Text} {
        max-width: 36rem;
    }

    @media (min-width: 1024px) {
        grid-template-columns: 1fr 1fr;
    }
`

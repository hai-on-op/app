import { useEffect, useRef } from 'react'

import { useMediaQuery } from '~/hooks'

import styled, { css } from 'styled-components'
import { Flex, CenteredFlex, Text, HaiButton, Grid, FlexStyle, FlexProps, Title } from '~/styles'
import { Header } from './Header'
import { BrandedTitle } from '~/components/BrandedTitle'

import splashImage from '~/assets/splash/splash.jpg'

export default function Splash() {
    const isLargerThanSmall = useMediaQuery('upToSmall')

    const parallax = useRef<HTMLElement>()

    useEffect(() => {
        const onScroll = () => {
            if (!parallax.current) return
            parallax.current.style.top = `${80 - window.scrollY / 4}px`
        }
        onScroll()
        window.addEventListener('scroll', onScroll)

        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (<>
        <Header/>
        <BackgroundImage ref={parallax as any}/>
        <Container>
            <Section>
                <BrandedTitle textContent="GET $HAI ON YOUR OWN SUPPLY"/>
                <Text>
                    {`Borrow and Earn on the world's most decentralized stablecoin protocol.`}
                    <br/>
                    {`Amplify your portfolio with $HAI, take control with $KITE.`}
                </Text>
                <HaiButton $variant="orangeish">Learn More</HaiButton>
            </Section>
            <Section>
                <DescriptionContainer>
                    <Text>HAI is a multi-collateral stable asset on the Optimism network, forked from RAI. Users deposit collateral to mint HAI, stabilized at $1. HAI utilizes a PI controller for price stability and introduces governance via KITE tokens.</Text>
                    <FeatureContainer>
                        <FeatureCard>
                            <Title>DECENTRALIZED</Title>
                            <Text>Censorship resistant stable asset governed by its holders</Text>
                        </FeatureCard>
                        <FeatureCard>
                            <Title>EFFICIENT</Title>
                            <Text>{`Get the most out of your assets with HAI's 110% Collateral Ratio`}</Text>
                        </FeatureCard>
                        <FeatureCard>
                            <Title>ANTI-BANK RUN</Title>
                            <Text>Pre-agreed exit rates handle even the worst of conditions</Text>
                        </FeatureCard>
                        <FeatureCard>
                            <Title>{`GET $HAI'ER`}</Title>
                            <Text>Minimum $200 of collateral to open a safe and participate</Text>
                        </FeatureCard>
                    </FeatureContainer>
                </DescriptionContainer>
            </Section>
            <Section>
                <ActionContainer>
                    <ActionCard>
                        <Title>BORROW</Title>
                        <ul>
                            <li>Borrow $HAI and multiply your crypto exposure</li>
                            <li>Easily create vaults with $ETH, $OP</li>
                            <li>Track your balance, debt, and collateral all from one place</li>
                        </ul>
                    </ActionCard>
                    <ActionCard>
                        <Title>EARN</Title>
                        <ul>
                            <li>Holders collect monthly rewards for providing liquidity</li>
                            <li>Rewards are in $KITE which gives liquidity providers further control of the protocol</li>
                        </ul>
                    </ActionCard>
                    <ActionCard>
                        <Title>SNIPE</Title>
                        <ul>
                            <li>Buy $ETH, $OP, $stETH at a discount</li>
                            <li>Liquidated assets go into Auction to be sold below spot</li>
                        </ul>
                    </ActionCard>
                </ActionContainer>
            </Section>
            <Section>
                <Flex
                    $width="100%"
                    $justify="space-between"
                    $align="center">
                    <BrandedTitle textContent="LEARN MORE"/>
                    {isLargerThanSmall && (
                        <CenteredFlex $gap={16}>
                            <LearnMoreButton></LearnMoreButton>
                            <LearnMoreButton></LearnMoreButton>
                        </CenteredFlex>
                    )}
                </Flex>
                <Flex $gap={48}>
                    <LearnMoreCard>
                        <Text>Introducing:</Text>
                        <Text $fontWeight="bold">HAI Protocol</Text>
                    </LearnMoreCard>
                    <LearnMoreCard>
                        <Text>Introducing:</Text>
                        <Text $fontWeight="bold">HAI Protocol</Text>
                    </LearnMoreCard>
                    <LearnMoreCard>
                        <Text>Introducing:</Text>
                        <Text $fontWeight="bold">HAI Protocol</Text>
                    </LearnMoreCard>
                </Flex>
            </Section>
        </Container>
    </>)
}

const Container = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 320,
    ...props
}))`
    padding-top: min(calc(100vh - 360px), 800px);
    z-index: 1;
`
const BackgroundImage = styled(CenteredFlex)`
    width: 100%;
    height: 100vh;
    max-height: 800px;
    position: fixed;
    top: 80px;
    background-image: url('${splashImage}');
    background-size: cover;
    background-position: center center;
    background-repeat: no-repeat;

    z-index: -1;
`

const Section = styled.section.attrs(props => ({
    $column: true,
    $justify: 'center',
    $align: 'flex-start',
    $gap: 32,
    ...props
}))<FlexProps & { $bg?: string }>`
    ${FlexStyle}
    overflow: hidden;
    min-height: 360px;
    padding: 48px;
    border-top: ${({ theme }) => theme.border.medium};
    border-bottom: ${({ theme }) => theme.border.medium};
    box-shadow: 0 3px 17px rgba(0,0,0,0.3);

    background-color: ${({ $bg = '#bfe3f1' }) => $bg};
    ${({ $bg = '#bfe3f1' }) => $bg === 'transparent' && css`
        border: none;
        box-shadow: none;
    `}

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 24px;
    `}
`

const DescriptionContainer = styled(Grid)`
    grid-template-columns: 1fr 1fr;
    gap: 24px;

    ${({ theme }) => theme.mediaWidth.upToMedium`
        grid-template-columns: 1fr;
    `}
`
const FeatureContainer = styled(Grid)`
    grid-template-columns: 1fr 1fr;
    gap: 24px;

    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        grid-template-columns: 1fr;
    `}
`

const ActionContainer = styled(Grid)`
    width: fit-content;
    max-width: 1000px;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    justify-content: stretch;
    align-self: center;
    gap: 48px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr 1fr;
    `}
`

const FeatureCard = styled(Flex).attrs(props => ({
    $column: true,
    $gap: 12,
    ...props
}))`
    & > ${Title} {
        font-size: 2rem;
    }
    &:nth-of-type(1) {
        & > ${Title} {
            color: ${({ theme }) => theme.colors.pinkish};
        }
    }
    &:nth-of-type(2) {
        & > ${Title} {
            color: ${({ theme }) => theme.colors.orangeish};
        }
    }
    &:nth-of-type(3) {
        & > ${Title} {
            color: ${({ theme }) => theme.colors.greenish};
        }
    }
    &:nth-of-type(4) {
        & > ${Title} {
            color: ${({ theme }) => theme.colors.blueish};
        }
    }
`

const ActionCard = styled(FeatureCard)`
    max-width: 360px;
    padding: 24px;
    flex-grow: 1;
    /* backdrop-filter: blur(13px); */
    border: 4px dashed black;

    & ul {
        margin: 0;
        padding-left: 24px;
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        max-width: unset;
    `}
`

const LearnMoreButton = styled(HaiButton).attrs(props => ({
    $variant: 'yellowish',
    ...props
}))`
    min-width: unset;
    width: 56px;
    height: 56px;
    padding: 0px;
    border: ${({ theme }) => theme.border.thick};
`
const LearnMoreCard = styled(Flex).attrs(props => ({
    $column: true,
    $gap: 12,
    ...props
}))`
    width: 240px;
    height: 240px;
    padding: 24px;
    border: 4px dashed black;
`

import { useEffect, useRef } from 'react'

import styled from 'styled-components'
import { Flex, CenteredFlex, Text, HaiButton, Grid, FlexStyle, FlexProps, Title } from '~/styles'
import { Header } from './Header'
import { BrandedTitle } from '~/components/BrandedTitle'

import splashImage from '~/assets/splash/splash.jpg'

export default function Splash() {
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
                <Grid
                    $columns="1fr 1fr"
                    $gap={24}>
                    <Text>HAI is a multi-collateral stable asset on the Optimism network, forked from RAI. Users deposit collateral to mint HAI, stabilized at $1. HAI utilizes a PI controller for price stability and introduces governance via KITE tokens.</Text>
                    <Grid
                        $columns="1fr 1fr"
                        $gap={24}>
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
                    </Grid>
                </Grid>
            </Section>
            <Section>
                <BrandedTitle textContent="LEARN MORE"/>
                <Flex $gap={24}>
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
    $gap: 24,
    ...props
}))<FlexProps & { $bg?: string, $padding?: string }>`
    ${FlexStyle}
    min-height: 360px;
    padding: ${({ $padding = '48px' }) => $padding};
    border-top: ${({ theme }) => theme.border.medium};
    border-bottom: ${({ theme }) => theme.border.medium};
    box-shadow: 0 3px 17px rgba(0,0,0,0.3);

    background-color: ${({ $bg = '#bfe3f1;' }) => $bg};
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

const LearnMoreCard = styled(Flex).attrs(props => ({
    $column: true,
    $gap: 12,
    ...props
}))`
    width: 240px;
    height: 240px;
    padding: 24px;
    background-color: white;
    border: 4px dashed black;
    box-shadow: 0 3px 17px rgba(0,0,0,0.3);
`

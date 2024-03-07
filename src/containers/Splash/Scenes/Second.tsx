import { useEffect, useState } from 'react'

import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { Flex, Grid, HaiButton, Text } from '~/styles'
import { ZoomScene, type ZoomSceneProps } from './ZoomScene'
import { BrandedTitle } from '~/components/BrandedTitle'
import { ProgressBar } from '~/components/ProgressBar'
import { FloatingElements, type FloatingElementsProps } from '~/components/BrandElements/FloatingElements'
import { TokenArray } from '~/components/TokenArray'

const elves: FloatingElementsProps['elves'] = [
    {
        index: 1,
        width: 'min(180px, 28vw)',
        style: {
            right: '30%',
            top: '-120px',
        },
        rotation: -20,
        zIndex: 1,
    },
]

const clouds: FloatingElementsProps['clouds'] = [
    {
        index: 0,
        width: '340px',
        style: {
            left: '-140px',
            bottom: '-200px',
        },
        zIndex: 1,
    },
    {
        index: 1,
        width: '190px',
        style: {
            right: '-50px',
            bottom: '-70px',
        },
        zIndex: 1,
    },
]

const coins: FloatingElementsProps['coins'] = [
    {
        index: 'HAI',
        width: 'min(180px, 25vw)',
        style: {
            right: '24%',
            bottom: 'clamp(-60px, calc(-240px + 25vw), 0px)',
        },
        rotation: -20,
        zIndex: 1,
    },
    {
        index: 'KITE',
        width: 'min(100px, 20vw)',
        thickness: 9,
        style: {
            top: '-20px',
            right: '0px',
        },
        rotation: 20,
        zIndex: 1,
    },
]

export function Second({ zIndex }: ZoomSceneProps) {
    const isUpToExtraSmall = useMediaQuery('upToExtraSmall')
    const isUpToSmall = useMediaQuery('upToSmall')

    const [progress, setProgress] = useState(0.72)
    useEffect(() => {
        const int = setInterval(() => setProgress(1.5 + 2.5 * Math.random()), 3000)
        return () => clearTimeout(int)
    }, [])

    return (
        <ZoomScene $zIndex={zIndex}>
            <Container>
                <Flex $column $gap={isUpToExtraSmall ? 12 : 24}>
                    <BrandedTitle
                        textContent="ELEVATE ASSETS, NOT ANXIETY."
                        $fontSize={isUpToExtraSmall ? '2rem' : isUpToSmall ? '3rem' : '3.6rem'}
                        $letterSpacing={isUpToExtraSmall ? '0.5rem' : isUpToSmall ? '0.6rem' : '0.7rem'}
                        $lineHeight={isUpToSmall ? '1.2' : '1.4'}
                    />
                    <Subtitle>
                        <Text as="span" $fontWeight={700}>
                            {`$HAI stablecoin reserves are fully on-chain, `}
                        </Text>
                        <span>{`no bank buzzkills here. `}</span>
                        <Text as="span" $fontWeight={700}>
                            {`Collateral choices are voted in by $KITE holders.`}
                        </Text>
                    </Subtitle>
                </Flex>
                <PairContainer>
                    <TokenArray tokens={['WETH', 'HAI']} />
                    <Grid $width="100%" $columns="110px 1fr" $align="center" $gap={12}>
                        <Text>
                            Ratio&nbsp;<strong>{Math.round(progress * 10_000) / 100}%</strong>
                        </Text>
                        <ProgressBar
                            progress={progress / 4}
                            colorLimits={[0.25, 0.75]}
                            labels={[
                                {
                                    progress: 0.24,
                                    label: '100%',
                                },
                            ]}
                        />
                    </Grid>
                    <Flex $width="100%" $justify="flex-start" $align="center" $gap={12}>
                        <HaiButton $variant="yellowish" $grow={0}>
                            Deposit
                        </HaiButton>
                        <HaiButton $grow={0}>Get HAI</HaiButton>
                    </Flex>
                </PairContainer>
            </Container>
            <FloatingElements elves={elves} clouds={clouds} coins={coins} />
        </ZoomScene>
    )
}

const Container = styled(Grid).attrs((props) => ({
    $columns: '1fr min-content',
    $justify: 'center',
    $align: 'center',
    ...props,
}))`
    width: min(1100px, calc(100vw - 48px));
    padding: 72px 48px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    /* background-color: #f1f1fb77; */
    /* backdrop-filter: blur(13px); */
    background-color: rgba(255, 255, 255, 0.5);

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr;
        grid-gap: 24px;
        padding: 24px;
        padding-top: 36px;
    `}
    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        width: calc(100vw - 24px);
        padding-top: 24px;
    `}
`
const Subtitle = styled(Text).attrs((props) => ({
    $lineHeight: '1.6',
    ...props,
}))`
    max-width: max(300px, 75%);
`
const PairContainer = styled(Flex).attrs((props) => ({
    $column: true,
    $justify: 'space-between',
    $align: 'flex-start',
    ...props,
}))`
    width: 320px;
    padding: 24px;
    gap: 24px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    background-color: #f1f1fb;
    transform: translateX(100px);

    ${({ theme }) => theme.mediaWidth.upToSmall`
        width: 100%;
        transform: none;
    `}
    ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 12px;
        gap: 12px;
    `}
`

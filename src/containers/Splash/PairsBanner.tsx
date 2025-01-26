import { useEffect, useRef, useState } from 'react'

import { TOKEN_LOGOS } from '~/utils'

import styled, { keyframes } from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'

const PAIR_WIDTH = 180

const pairs: [string, string][] = [
    ['OP', TOKEN_LOGOS.OP],
    ['WETH', TOKEN_LOGOS.WETH],
    ['WSTETH', TOKEN_LOGOS.WSTETH],
    ['SNX', TOKEN_LOGOS.SNX],
    ['RETH', TOKEN_LOGOS.RETH],
    ['LUSD', TOKEN_LOGOS['LUSD-A']],
    ['LINK', TOKEN_LOGOS['LINK']],
    ['TBTC', TOKEN_LOGOS['TBTC']],
    ['VELO', TOKEN_LOGOS['VELO']],
    ['HAIVELO', TOKEN_LOGOS['HAIVELO']],
    // ['WBTC', TOKEN_LOGOS['WBTC']],
    ['APXETH', TOKEN_LOGOS['APXETH']],
    ['Beefy Vaults', TOKEN_LOGOS['MOO']],
]

export function PairsBanner() {
    const [repeat, setRepeat] = useState(2)
    const repeatRef = useRef(repeat)
    repeatRef.current = repeat

    useEffect(() => {
        const onResize = () => {
            const w = window.innerWidth
            const r = Math.ceil(w / ((PAIR_WIDTH + 24) * pairs.length)) + 1
            if (r !== repeatRef.current) setRepeat(r)
        }
        onResize()
        window.addEventListener('resize', onResize)

        return () => window.removeEventListener('resize', onResize)
    }, [])

    return (
        <Container>
            <Inner>
                {Array.from({ length: repeat }, () => [...pairs])
                    .flat()
                    .map(([ticker, logo], i) => (
                        <Pair key={i}>
                            <IconContainer>
                                <img src={logo} alt="HAI" width={48} height={48} style={{ backgroundColor: 'white' }} />
                            </IconContainer>
                            <Text $fontWeight={900}>{ticker}</Text>
                        </Pair>
                    ))}
            </Inner>
        </Container>
    )
}

const rightToLeft = keyframes`
    0% { left: 0px; }
    100% { left: ${-(PAIR_WIDTH + 24) * pairs.length}px; }
`

const Container = styled(Flex).attrs((props) => ({
    $justify: 'flex-start',
    $align: 'center',
    ...props,
}))`
    position: absolute;
    left: 0px;
    right: 0px;
    bottom: 24px;
    height: 60px;
    overflow: visible;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        // height: 60px;
        bottom: 12px;
    `}
`
const Inner = styled(Flex).attrs((props) => ({
    $justify: 'flex-start',
    $align: 'center',
    $gap: 24,
    ...props,
}))`
    position: absolute;
    left: 0%;
    animation: ${rightToLeft} 40s linear infinite;
    width: ${(PAIR_WIDTH + 24) * pairs.length}px;
`
const Pair = styled(Flex).attrs((props) => ({
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    $shrink: 0,
    ...props,
}))`
    width: ${PAIR_WIDTH}px;
    height: 80px;
    padding: 24px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 16px;
    /* backdrop-filter: blur(13px); */
    background-color: rgba(255, 255, 255, 0.5);

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 12px;
        height: 60px;
    `}
`
const IconContainer = styled(CenteredFlex)`
    & > * {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: ${({ theme }) => theme.border.thin};
        background-color: ${({ theme }) => theme.colors.greenish};
    }
`

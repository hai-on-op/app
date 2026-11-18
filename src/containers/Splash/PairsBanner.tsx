import { useEffect, useState } from 'react'

import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useStoreState } from '~/store'
import type { TokenKey } from '~/types'
import { formatCollateralLabel, TOKEN_LOGOS } from '~/utils'

import styled, { keyframes } from 'styled-components'
import { CenteredFlex, Flex, Text } from '~/styles'

const PAIR_WIDTH = 180

export function PairsBanner() {
    const tokensData = useStoreState((state) => state.connectWalletModel.tokensData)
    const { isOpenableCollateral } = useAnalytics()
    const collaterals = Object.values(tokensData).filter(
        ({ symbol, isCollateral }) => isCollateral && isOpenableCollateral(symbol)
    )
    const groupWidth = (PAIR_WIDTH + 24) * collaterals.length
    const [repeat, setRepeat] = useState(2)

    useEffect(() => {
        if (!groupWidth) return
        const onResize = () => setRepeat(Math.ceil(window.innerWidth / groupWidth) + 1)
        onResize()
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [groupWidth])

    if (!groupWidth) return null

    return (
        <Container>
            <Inner style={{ width: groupWidth }}>
                {Array.from({ length: repeat }, (_, copy) =>
                    collaterals.map(({ symbol }) => {
                        const logo = TOKEN_LOGOS[symbol as TokenKey]
                        const label = formatCollateralLabel(symbol)
                        return (
                            <Pair key={`${copy}-${symbol}`} aria-hidden={copy > 0}>
                                {logo && (
                                    <IconContainer>
                                        <img src={logo} alt="" width={48} height={48} />
                                    </IconContainer>
                                )}
                                <Text $fontWeight={900} $fontSize={label.length > 12 ? 12 : undefined}>
                                    {label}
                                </Text>
                            </Pair>
                        )
                    })
                )}
            </Inner>
        </Container>
    )
}

const rightToLeft = keyframes`
    from { transform: translateX(0); }
    to { transform: translateX(-100%); }
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
        background-color: white;
    }
`

import { LINK_TO_DOCS } from '~/utils'

import styled from 'styled-components'
import { BlurContainer, Flex, Grid, HaiButton, Text } from '~/styles'
import { EarnStrategy, type EarnStrategyProps } from './Strategy'
import { type DummyStrategy, StrategyTable } from './StrategyTable'

const dummyRows: DummyStrategy[] = [
    {
        pair: ['WETH', 'HAI'],
        rewards: ['OP', 'KITE'],
        tvl: "$5.6M",
        vol24hr: "$5.6M",
        apy: 0.19,
        userPosition: "$300k",
        userApy: 0.19,
        earnPlatform: 'uniswap'
    },
    {
        pair: ['WBTC', 'HAI'],
        rewards: ['OP', 'KITE'],
        tvl: "$5.6M",
        vol24hr: "$5.6M",
        apy: 0.19,
        earnPlatform: 'velodrome'
    },
    {
        pair: ['KITE', 'OP'],
        rewards: ['OP', 'KITE'],
        tvl: "$5.6M",
        vol24hr: "$5.6M",
        apy: 0.19,
        earnPlatform: 'velodrome'
    }
]

const strategies: EarnStrategyProps[] = [
    {
        heading: 'OP REWARDS',
        status: 'NOW LIVE',
        description: 'Earn OP tokens by minting & borrowing HAI',
        ctaLink: LINK_TO_DOCS,
        tokenImages: ['OP']
    },
    {
        heading: 'KITE REWARDS',
        status: 'NOW LIVE',
        description: 'Earn KITE tokens by minting & borrowing HAI',
        ctaLink: LINK_TO_DOCS,
        tokenImages: ['KITE']
    }
]

export function Earn() {
    return (
        <Container>
            <Header>
                <Nav>
                    <Text>All Strategies (3)</Text>
                </Nav>
                <OnlyButton>
                    <OnlyCheckbox/>
                    <Text>Only Show My Positions</Text>
                </OnlyButton>
            </Header>
            <Body>
                <StrategyTable rows={dummyRows}/>
                {strategies.map((strat, i) => (
                    <EarnStrategy
                        key={i}
                        bgVariant={i}
                        {...strat}
                    />
                ))}
            </Body>
        </Container>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
`

const Header = styled(Flex).attrs(props => ({
    $justify: 'space-between',
    $align: 'center',
    ...props
}))`
    height: 144px;
    padding: 0 48px;
    border-bottom: ${({ theme }) => theme.border.medium};
`
const Nav = styled(Grid).attrs(props => ({
    $columns: '1fr',
    $align: 'flex-end',
    ...props
}))`
    height: 100%;
    & > * {
        padding: 24px 12px;
        font-weight: 700;
        border-bottom: ${({ theme }) => theme.border.medium};
    }
`
const OnlyButton = styled(HaiButton)`
    height: 48px;
    padding-left: 12px;
    font-weight: 400;
`
const OnlyCheckbox = styled.div`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: ${({ theme }) => theme.border.thin};
`
const Body = styled(Flex).attrs(props => ({
    $column: true,
    $gap: 24,
    ...props
}))`
    width: 100%;
    padding: 48px;
    padding-top: 24px;
`

import { useMemo, useState } from 'react'

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
        vol24hr: "$4.6M",
        apy: 0.19,
        userPosition: "$300k",
        userApy: 0.15,
        earnPlatform: 'uniswap'
    },
    {
        pair: ['WBTC', 'HAI'],
        rewards: ['OP', 'KITE'],
        tvl: "$5.5M",
        vol24hr: "$5.1M",
        apy: 0.11,
        earnPlatform: 'velodrome'
    },
    {
        pair: ['KITE', 'OP'],
        rewards: ['OP', 'KITE'],
        tvl: "$4.6M",
        vol24hr: "$1.2M",
        apy: 0.09,
        userPosition: "$169k",
        userApy: 0.11,
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
    const [filterEmpty, setFilterEmpty] = useState(false)
    
    const filteredRows = useMemo(() => {
        if (!filterEmpty) return dummyRows

        return dummyRows.filter(({ userPosition }) => !!userPosition)
    }, [filterEmpty])

    return (
        <Container>
            <Header>
                <Nav>
                    <Text>All Strategies ({filteredRows.length})</Text>
                </Nav>
                <OnlyButton onClick={() => setFilterEmpty(e => !e)}>
                    <OnlyCheckbox $active={filterEmpty}/>
                    <Text>Only Show My Positions</Text>
                </OnlyButton>
            </Header>
            <Body>
                <StrategyTable rows={filteredRows}/>
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
const OnlyCheckbox = styled.div<{ $active?: boolean }>`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: ${({ theme }) => theme.border.thin};
    background-color: ${({ $active }) => $active ? 'black': 'transparent'};
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

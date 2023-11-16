import { useMemo, useState } from 'react'

import { LINK_TO_DOCS } from '~/utils'

import { NavContainer } from '~/components/NavContainer'
import { EarnStrategy, type EarnStrategyProps } from './Strategy'
import { type DummyStrategy, StrategyTable } from './StrategyTable'
import { CheckboxButton } from '~/components/CheckboxButton'

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
        <NavContainer
            navItems={[`All Strategies (${filteredRows.length})`]}
            selected={0}
            onSelect={() => 0}
            headerContent={(
                <CheckboxButton
                    checked={filterEmpty}
                    toggle={() => setFilterEmpty(e => !e)}>
                    Only Show My Positions
                </CheckboxButton>
            )}>
            <StrategyTable rows={filteredRows}/>
            {strategies.map((strat, i) => (
                <EarnStrategy
                    key={i}
                    bgVariant={i}
                    {...strat}
                />
            ))}
        </NavContainer>
    )
}

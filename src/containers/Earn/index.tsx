import { useMemo, useState } from 'react'

import type { Strategy } from '~/types'

import { NavContainer } from '~/components/NavContainer'
import { StrategyTable } from './StrategyTable'
import { CheckboxButton } from '~/components/CheckboxButton'

const dummyRows: Strategy[] = [
    {
        pair: ['WETH', 'HAI'],
        rewards: ['OP', 'KITE'],
        tvl: '$5.6M',
        vol24hr: '$4.6M',
        apy: 0.19,
        userPosition: '$300k',
        userApy: 0.15,
        earnPlatform: 'uniswap',
    },
    {
        pair: ['WBTC', 'HAI'],
        rewards: ['OP', 'KITE'],
        tvl: '$5.5M',
        vol24hr: '$5.1M',
        apy: 0.11,
        earnPlatform: 'velodrome',
    },
    {
        pair: ['KITE', 'OP'],
        rewards: ['OP', 'KITE'],
        tvl: '$4.6M',
        vol24hr: '$1.2M',
        apy: 0.09,
        userPosition: '$169k',
        userApy: 0.11,
        earnPlatform: 'velodrome',
    },
    {
        pair: ['WETH'],
        rewards: ['OP', 'KITE'],
        tvl: '$4.6M',
        vol24hr: '$1.2M',
        apy: 0.09,
        userPosition: '$169k',
        userApy: 0.11,
    },
    {
        pair: ['OP'],
        rewards: ['OP', 'KITE'],
        tvl: '$4.6M',
        vol24hr: '$1.2M',
        apy: 0.09,
        userPosition: '$169k',
        userApy: 0.11,
    },
    {
        pair: ['WBTC'],
        rewards: ['OP', 'KITE'],
        tvl: '$4.6M',
        vol24hr: '$1.2M',
        apy: 0.09,
        userPosition: '$169k',
        userApy: 0.11,
    },
    {
        pair: ['WSTETH'],
        rewards: ['OP', 'KITE'],
        tvl: '$4.6M',
        vol24hr: '$1.2M',
        apy: 0.09,
        userPosition: '$169k',
        userApy: 0.11,
    },
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
        </NavContainer>
    )
}

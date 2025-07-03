import { useEarnStrategies, useMediaQuery } from '~/hooks'
import { useEffect, useMemo } from 'react'

import { NavContainer } from '~/components/NavContainer'
import { StrategyTable } from './StrategyTable'
import { CheckboxButton } from '~/components/CheckboxButton'
import { SortByDropdown } from '~/components/SortByDropdown'
import { WrapperAdProps, WrapperAd } from '~/components/WrapperAd'

const wrappers: WrapperAdProps[] = [
    /*{
        heading: 'OP REWARDS',
        status: 'NOW LIVE',
        description: 'Earn OP tokens daily by participating in incentive campaigns.',
        cta: 'Provide Liquidity',
        ctaLink: 'https://app.uniswap.org/explore/pools/optimism/0x146b020399769339509c98b7b353d19130c150ec',
        tokenImages: ['OP'],
    },*/
]

export function Earn() {
    const {
        rawData,
        headers,
        rows,
        loading,
        error,
        uniError,
        veloError,
        sorting,
        setSorting,
        filterEmpty,
        setFilterEmpty,
    } = useEarnStrategies()

    const isUpToMedium = useMediaQuery('upToMedium')

    return (
        <NavContainer
            navItems={[`All Strategies (${rows.length})`]}
            selected={0}
            onSelect={() => 0}
            compactQuery="upToMedium"
            headerContent={
                <>
                    <CheckboxButton checked={filterEmpty} toggle={() => setFilterEmpty((e) => !e)}>
                        Only Show My Positions
                    </CheckboxButton>
                    {isUpToMedium && <SortByDropdown headers={headers} sorting={sorting} setSorting={setSorting} />}
                </>
            }
        >
            <StrategyTable
                headers={headers}
                rows={rows as any}
                loading={loading}
                error={error as any}
                uniError={uniError as any}
                veloError={veloError as any}
                sorting={sorting}
                setSorting={setSorting}
            />
            <>
                {wrappers.map((wrapper, i) => (
                    <WrapperAd key={i} bgVariant={i} {...wrapper} />
                ))}
            </>
        </NavContainer>
    )
}

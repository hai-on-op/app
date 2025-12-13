import { useEarnStrategies, useMediaQuery } from '~/hooks'

import { NavContainer } from '~/components/NavContainer'
import { StrategyTable } from './StrategyTable'
import { CheckboxButton } from '~/components/CheckboxButton'
import { SortByDropdown } from '~/components/SortByDropdown'
import { WrapperAdProps, WrapperAd } from '~/components/WrapperAd'
import { useAccount } from 'wagmi'

const wrappers: WrapperAdProps[] = [
    {
        heading: 'KITE REWARDS',
        status: 'NOW LIVE',
        description: 'Earn KITE tokens daily by minting HAI.',
        cta: 'Get HAI to Earn',
        ctaLink: '/vaults',
        tokenImages: ['KITE'],
    },
]

export function Earn() {
    const { isConnected } = useAccount()
    const { headers, rows, loading, error, uniError, veloError, sorting, setSorting, filterEmpty, setFilterEmpty } =
        useEarnStrategies()

    const isUpToMedium = useMediaQuery('upToMedium')

    return (
        <NavContainer
            navItems={[`All Strategies (${rows.length})`]}
            selected={0}
            onSelect={() => 0}
            compactQuery="upToMedium"
            headerContent={
                <>
                    {isConnected && (
                        <CheckboxButton checked={filterEmpty} toggle={() => setFilterEmpty((e) => !e)}>
                            Only Show My Positions
                        </CheckboxButton>
                    )}
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

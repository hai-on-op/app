import { useEffect } from 'react'
import { useMediaQuery } from '~/hooks'
import { useEarnContext } from '~/providers/EarnProvider'

import { NavContainer } from '~/components/NavContainer'
import { StrategyTable } from './StrategyTable'
import { CheckboxButton } from '~/components/CheckboxButton'
import { SortByDropdown } from '~/components/SortByDropdown'
import { WrapperAdProps, WrapperAd } from '~/components/WrapperAd'
import { useAccount } from 'wagmi'
import { getErrorMessage, shouldHaltExecution } from '~/utils/errorHandling'

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
    const { headers, rows, loading, error, sorting, setSorting, filterEmpty, setFilterEmpty } = useEarnContext()

    const isUpToMedium = useMediaQuery('upToMedium')
    useEffect(() => {
        if (!isConnected) setFilterEmpty(false)
    }, [isConnected, setFilterEmpty])

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
                error={shouldHaltExecution(error) ? getErrorMessage(error) : undefined}
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

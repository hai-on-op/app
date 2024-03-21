import { useEarnStrategies, useMediaQuery } from '~/hooks'

import { NavContainer } from '~/components/NavContainer'
import { StrategyTable } from './StrategyTable'
import { CheckboxButton } from '~/components/CheckboxButton'
import { SortByDropdown } from '~/components/SortByDropdown'

export function Earn() {
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
                    <CheckboxButton checked={filterEmpty} toggle={() => setFilterEmpty((e) => !e)}>
                        Only Show My Positions
                    </CheckboxButton>
                    {isUpToMedium && <SortByDropdown headers={headers} sorting={sorting} setSorting={setSorting} />}
                </>
            }
        >
            <StrategyTable
                headers={headers}
                rows={rows}
                loading={loading}
                error={error}
                uniError={uniError}
                veloError={veloError}
                sorting={sorting}
                setSorting={setSorting}
            />
        </NavContainer>
    )
}

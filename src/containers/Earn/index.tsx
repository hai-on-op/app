import { useEarnStrategies, useMediaQuery } from '~/hooks'

import { NavContainer } from '~/components/NavContainer'
import { StrategyTable } from './StrategyTable'
import { CheckboxButton } from '~/components/CheckboxButton'
import { SortByDropdown } from '~/components/SortByDropdown'

export function Earn() {
    const { headers, rows, sorting, setSorting, filterEmpty, setFilterEmpty } = useEarnStrategies()

    const isLargerThanSmall = useMediaQuery('upToSmall')

    return (
        <NavContainer
            navItems={[`All Strategies (${rows.length})`]}
            selected={0}
            onSelect={() => 0}
            headerContent={
                <>
                    <CheckboxButton checked={filterEmpty} toggle={() => setFilterEmpty((e) => !e)}>
                        Only Show My Positions
                    </CheckboxButton>
                    {!isLargerThanSmall && (
                        <SortByDropdown headers={headers} sorting={sorting} setSorting={setSorting} />
                    )}
                </>
            }
        >
            <StrategyTable headers={headers} rows={rows} sorting={sorting} setSorting={setSorting} />
        </NavContainer>
    )
}

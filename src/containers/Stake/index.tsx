import { useState } from 'react'

import { useEarnStrategies, useMediaQuery } from '~/hooks'

import { NavContainer } from '~/components/NavContainer'
import { CheckboxButton } from '~/components/CheckboxButton'
import { SortByDropdown } from '~/components/SortByDropdown'

export function Stake() {
    const [navIndex, setNavIndex] = useState(0)

    return (
        <NavContainer
            navItems={[`Manage`, 'Activity']}
            selected={navIndex}
            onSelect={(i: number) => setNavIndex(i)}
            compactQuery="upToMedium"
            headerContent={<></>}
        >
            {navIndex === 0 ? <div>Manage Staking</div> : <div>Staking Activities</div>}
        </NavContainer>
    )
}

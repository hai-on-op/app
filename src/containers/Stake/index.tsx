import { useState } from 'react'

import { useEarnStrategies, useMediaQuery } from '~/hooks'

import { NavContainer } from '~/components/NavContainer'
import { CheckboxButton } from '~/components/CheckboxButton'
import { SortByDropdown } from '~/components/SortByDropdown'
import { Grid } from '~/styles'
import styled from 'styled-components'
import { Overview } from './Manage/Overview'
import { ManageStaking } from './Manage/ManageStaking'
import { StakeActivity } from './Activity'

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
            {navIndex === 0 ? (
                <BodyGrid>
                    <Overview />
                    <ManageStaking />
                </BodyGrid>
            ) : (
                <StakeActivity />
            )}
        </NavContainer>
    )
}

const BodyGrid = styled(Grid)`
    width: 100%;
    grid-template-columns: 5fr 3fr;
    grid-gap: 48px;

    ${({ theme }) => theme.mediaWidth.upToMedium`
        grid-template-columns: 1fr;
        grid-gap: 24px;
        padding: 24px;
    `}
`

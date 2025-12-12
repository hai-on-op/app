import { useState } from 'react'
import styled from 'styled-components'

import type { StakingConfig } from '~/types/stakingConfig'
import { createStakingClient } from '~/services/staking/client'
import { NavContainer } from '~/components/NavContainer'
import { Grid } from '~/styles'
import { Overview } from './Manage/Overview'
import { ManageStaking } from './Manage/ManageStaking'
import { StakeActivity } from './Activity'

export type StakingSimulation = {
    stakingAmount: string
    unstakingAmount: string
    setStakingAmount: (amount: string) => void
    setUnstakingAmount: (amount: string) => void
}

type StakingExperienceProps = {
    config: StakingConfig
    client?: ReturnType<typeof createStakingClient>
}

export function StakingExperience({ config, client }: StakingExperienceProps) {
    const [_client] = useState(client || createStakingClient(config))
    const [navIndex, setNavIndex] = useState(0)
    const [stakingAmount, setStakingAmount] = useState('')
    const [unstakingAmount, setUnstakingAmount] = useState('')

    const simulation: StakingSimulation = {
        stakingAmount,
        unstakingAmount,
        setStakingAmount,
        setUnstakingAmount,
    }

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
                    <Overview simulation={simulation} config={config} />
                    <ManageStaking simulation={simulation} config={config} />
                </BodyGrid>
            ) : (
                <StakeActivity config={config} />
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

import { useStakingActivity } from '~/hooks/staking/useStakingActivity'
import { StakingActivityTable } from './StakingActivityTable'
import styled from 'styled-components'
import { Loader } from '~/components/Loader'
import type { StakingConfig } from '~/types/stakingConfig'

type StakeActivityProps = {
    config?: StakingConfig
}

export function StakeActivity({ config }: StakeActivityProps) {
    const { positions, loading } = useStakingActivity(config)

    if (loading) {
        return (
            <Container>
                <Loader size={32} />
            </Container>
        )
    }

    return (
        <Container>
            <StakingActivityTable positions={positions} loading={loading} config={config} />
        </Container>
    )
}

const Container = styled.div`
    width: 100%;
    min-height: 200px;
    display: flex;
    justify-content: center;
    align-items: center;
`

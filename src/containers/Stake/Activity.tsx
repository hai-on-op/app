import { useStakingData } from '~/hooks/useStakingData'
import { StakingActivityTable } from './StakingActivityTable'
import styled from 'styled-components'
import { Loader } from '~/components/Loader'

export function StakeActivity() {
    const { stakingData, loading } = useStakingData()

    if (loading) {
        return (
            <Container>
                <Loader size={32} />
            </Container>
        )
    }

    return (
        <Container>
            <StakingActivityTable 
                positions={stakingData.stakingPositions} 
                loading={loading} 
            />
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

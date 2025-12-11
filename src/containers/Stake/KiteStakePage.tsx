import { StakingExperience } from '~/containers/Stake/StakingExperience'
import { kiteConfig } from '~/staking/configs/kite'

export function KiteStakePage() {
    return <StakingExperience config={kiteConfig} />
}

export default KiteStakePage



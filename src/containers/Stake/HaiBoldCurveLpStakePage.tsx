import { StakingExperience } from '~/containers/Stake/StakingExperience'
import { haiBoldCurveLpConfig } from '~/staking/configs/haiBoldCurveLp'

export function HaiBoldCurveLpStakePage() {
    return <StakingExperience config={haiBoldCurveLpConfig} />
}

export default HaiBoldCurveLpStakePage

import { Contract, BigNumber } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { contracts } from '~/config/contracts'

export type StakingApy = {
    id: number
    rpToken: string
    rpRate: BigNumber
}

export async function getStakingApy(provider: Provider): Promise<StakingApy[]> {
    const sm = new Contract(contracts.stakingManager.address, contracts.abis.stakingManager, provider)
    const rewardsCountBn: BigNumber = await sm.rewards()
    const rewardsCount = rewardsCountBn.toNumber()
    const apyData: StakingApy[] = []

    for (let i = 0; i < rewardsCount; i++) {
        const poolData: { isActive: boolean; rewardPool: string; rewardToken: string } = await sm.rewardTypes(i)
        if (!poolData.isActive) continue
        const rp = new Contract(poolData.rewardPool, contracts.abis.rewardPool, provider)
        const rpRate: BigNumber = await rp.rewardRate()
        apyData.push({ id: i, rpToken: poolData.rewardToken, rpRate })
    }
    return apyData
}



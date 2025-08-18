import { Contract, BigNumber, utils } from 'ethers'
import type { Provider } from '@ethersproject/providers'
import { contracts } from '~/config/contracts'
import type { Address, AggregatedReward, StakingApyItem, WeiString } from '~/types/rewards'

export type TxResponse = { hash: string; from: string; wait: () => Promise<unknown> }

function toWeiString(value: BigNumber): WeiString {
    return utils.formatEther(value)
}

export async function getApy(provider: Provider): Promise<StakingApyItem[]> {
    const sm = new Contract(contracts.stakingManager.address, contracts.abis.stakingManager, provider)
    const rewardsCountBn: BigNumber = await sm.rewards()
    const rewardsCount = rewardsCountBn.toNumber()
    const apyData: StakingApyItem[] = []

    for (let i = 0; i < rewardsCount; i++) {
        const poolData: { isActive: boolean; rewardPool: string; rewardToken: Address } = await sm.rewardTypes(i)
        if (!poolData.isActive) continue
        const rp = new Contract(poolData.rewardPool, contracts.abis.rewardPool, provider)
        const rpRate: BigNumber = await rp.rewardRate()
        apyData.push({ id: i, rpToken: poolData.rewardToken as Address, rpRateWei: toWeiString(rpRate) })
    }
    return apyData
}

export async function getUserRewards(address: Address, provider: Provider): Promise<AggregatedReward[]> {
    const sm = new Contract(contracts.stakingManager.address, contracts.abis.stakingManager, provider)
    const rewardsCountBn: BigNumber = await sm.rewards()
    const rewardsCount = rewardsCountBn.toNumber()

    // Determine active pool indexes
    const activeIndexes: number[] = []
    for (let i = 0; i < rewardsCount; i++) {
        const poolData: { isActive: boolean } = await sm.rewardTypes(i)
        if (poolData.isActive) activeIndexes.push(i)
    }

    // earned returns the full array, index-aligned
    const earned: Array<{ rewardToken: Address; rewardAmount: BigNumber }> = await sm.callStatic.earned(address)

    const aggregated: Record<string, BigNumber> = {}
    for (const idx of activeIndexes) {
        const { rewardToken, rewardAmount } = earned[idx] || { rewardToken: '0x0', rewardAmount: BigNumber.from(0) }
        if (rewardAmount && rewardAmount.gt(0)) {
            const key = (rewardToken as string).toLowerCase()
            aggregated[key] = (aggregated[key] || BigNumber.from(0)).add(rewardAmount)
        }
    }

    return Object.entries(aggregated).map(([token, amount]) => ({
        tokenAddress: token as Address,
        amountWei: toWeiString(amount),
    }))
}

export async function claimRewards(signer: any): Promise<TxResponse> {
    const sm = new Contract(contracts.stakingManager.address, contracts.abis.stakingManager, signer)
    const user = await signer.getAddress()
    const txData = await sm.populateTransaction.getReward(user)
    const tx = await signer.sendTransaction(txData)
    await tx.wait()
    return tx
}



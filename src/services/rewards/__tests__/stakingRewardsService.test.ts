import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as ethers from 'ethers'
import { getApy, getUserRewards, claimRewards } from '../stakingRewardsService'

const provider: any = {} as any

function mockContract(methods: Record<string, any>) {
    return { ...methods }
}

beforeEach(() => {
    vi.restoreAllMocks()
})

describe('stakingRewardsService.getApy', () => {
    it('returns active pools with rewardRate (as WeiString)', async () => {
        const rewardsCount = ethers.BigNumber.from(3)
        const rate = ethers.utils.parseUnits('1', 18)
        const rpMock = mockContract({ rewardRate: () => rate })
        vi.spyOn(ethers as any, 'Contract')
            .mockImplementationOnce(() =>
                mockContract({
                    rewards: () => rewardsCount,
                    rewardTypes: (i: number) => ({ isActive: i !== 1, rewardPool: `0xpool${i}`, rewardToken: `0xtoken${i}` }),
                })
            )
            .mockImplementation(() => rpMock)

        const res = await getApy(provider)
        expect(res).toEqual([
            { id: 0, rpToken: '0xtoken0', rpRateWei: '1.0' },
            { id: 2, rpToken: '0xtoken2', rpRateWei: '1.0' },
        ])
    })
})

describe('stakingRewardsService.getUserRewards', () => {
    it('aggregates earned rewards for active pools and formats to WeiString', async () => {
        const rewardsCount = ethers.BigNumber.from(2)
        const earned = [
            { rewardToken: '0xabc', rewardAmount: ethers.utils.parseUnits('2', 18) },
            { rewardToken: '0xdef', rewardAmount: ethers.utils.parseUnits('3', 18) },
        ]
        vi.spyOn(ethers as any, 'Contract').mockImplementation(() =>
            mockContract({
                rewards: () => rewardsCount,
                rewardTypes: (i: number) => ({ isActive: true }),
                callStatic: { earned: () => earned },
            })
        )

        const res = await getUserRewards('0xuser' as any, provider)
        expect(res).toEqual([
            { tokenAddress: '0xabc', amountWei: '2.0' },
            { tokenAddress: '0xdef', amountWei: '3.0' },
        ])
    })
})

describe('stakingRewardsService.claimRewards', () => {
    it('sends claim transaction for user', async () => {
        const tx = { hash: '0xhash', from: '0xuser', wait: vi.fn().mockResolvedValue({}) }
        const signer = {
            getAddress: vi.fn().mockResolvedValue('0xuser'),
            sendTransaction: vi.fn().mockResolvedValue(tx),
        }
        vi.spyOn(ethers as any, 'Contract').mockImplementation(() =>
            mockContract({ populateTransaction: { getReward: (_: string) => ({ to: '0xmanager' }) } })
        )

        const res = await claimRewards(signer)
        expect(signer.sendTransaction).toHaveBeenCalled()
        expect(res).toBe(tx)
    })
})



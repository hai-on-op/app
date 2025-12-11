import { describe, it, expect, vi } from 'vitest'
import * as ethers from 'ethers'
import { getStakingApy } from '../rewardsService'

const provider: any = {} as any

function mockContract(methods: Record<string, any>) {
    return { ...methods }
}

describe('rewardsService.getStakingApy', () => {
    it('returns active pools with rewardRate', async () => {
        const rewardsCount = ethers.BigNumber.from(3)
        const rate = ethers.BigNumber.from('1000')
        const rpMock = mockContract({ rewardRate: () => rate })
        vi.spyOn(ethers as any, 'Contract')
            .mockImplementationOnce(() =>
                mockContract({
                    rewards: () => rewardsCount,
                    rewardTypes: (i: number) => ({ isActive: i !== 1, rewardPool: `0xpool${i}`, rewardToken: `0xtoken${i}` }),
                })
            )
            .mockImplementation(() => rpMock)

        const res = await getStakingApy(provider)
        expect(res).toEqual([
            { id: 0, rpToken: '0xtoken0', rpRate: rate },
            { id: 2, rpToken: '0xtoken2', rpRate: rate },
        ])
    })
})



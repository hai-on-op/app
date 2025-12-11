import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as ethers from 'ethers'
import { getTotalStaked, getStakedBalance, getCooldown, getRewards } from '../stakingService'

const provider: any = {} as any

function mockContract(methods: Record<string, any>) {
    return {
        ...methods,
    }
}

describe('stakingService (reads)', () => {
    const original = { ...ethers }

    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('getTotalStaked returns formatted ether string', async () => {
        const total = ethers.BigNumber.from('123000000000000000000')
        vi.spyOn(ethers as any, 'Contract').mockImplementation(() => mockContract({ totalStaked: () => total }))
        const res = await getTotalStaked(provider)
        expect(res).toBe('123.0')
    })

    it('getStakedBalance returns formatted ether string', async () => {
        const bal = ethers.BigNumber.from('450000000000000000')
        vi.spyOn(ethers as any, 'Contract').mockImplementation(() => mockContract({ stakedBalances: () => bal }))
        const res = await getStakedBalance('0x'.padEnd(42, 'a') as any, provider)
        expect(res).toBe('0.45')
    })

    it('getCooldown returns seconds as number', async () => {
        const secs = ethers.BigNumber.from(86400)
        vi.spyOn(ethers as any, 'Contract').mockImplementation(() => mockContract({ _params: () => secs }))
        const res = await getCooldown(provider)
        expect(res).toBe(86400)
    })

    it('getRewards aggregates active pools only and formats ether', async () => {
        const rewardsCount = ethers.BigNumber.from(3)
        const earnedArray = [
            { rewardToken: '0x'.padEnd(42, '1'), rewardAmount: ethers.BigNumber.from('1000000000000000000') },
            { rewardToken: '0x'.padEnd(42, '2'), rewardAmount: ethers.BigNumber.from('0') },
            { rewardToken: '0x'.padEnd(42, '1'), rewardAmount: ethers.BigNumber.from('500000000000000000') },
        ]
        vi.spyOn(ethers as any, 'Contract').mockImplementation(() =>
            mockContract({
                rewards: () => rewardsCount,
                rewardTypes: (i: number) => ({ isActive: i !== 1 }),
                callStatic: { earned: () => earnedArray },
            })
        )
        const res = await getRewards('0x'.padEnd(42, 'a') as any, provider)
        expect(res).toEqual([
            { tokenAddress: '0x1111111111111111111111111111111111111111', amount: '1.5' },
        ])
    })
})



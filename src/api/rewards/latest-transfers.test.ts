import { describe, expect, it } from 'vitest'
import { providers, utils } from 'ethers'
import { applyTransfers } from './latest-transfers'
import { REWARD_DEPOSITERS } from '../../services/rewards/transferStreams'

describe('latest nonzero rewards', () => {
    const log = (
        stream: keyof typeof REWARD_DEPOSITERS,
        blockNumber: number,
        logIndex: number,
        amount: number,
        removed = false
    ) =>
        ({
            topics: ['', utils.hexZeroPad(REWARD_DEPOSITERS[stream], 32)],
            blockNumber,
            logIndex,
            data: utils.hexValue(amount),
            removed,
        }) as providers.Log

    it('selects the latest canonical nonzero transfer separately for each depositer', () => {
        const initial = { haiVelo: '2', haiAero: '3' }
        expect(
            applyTransfers(initial, [
                log('haiAero', 10, 1, 10),
                log('haiVelo', 9, 1, 5),
                log('haiAero', 10, 0, 4),
                log('haiVelo', 11, 0, 0),
                log('haiVelo', 12, 0, 6, true),
            ])
        ).toEqual({ haiVelo: '5', haiAero: '10' })
        expect(initial).toEqual({ haiVelo: '2', haiAero: '3' })
    })
})

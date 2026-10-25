import { ethers } from 'ethers'
import { getTokenList } from '@hai-on-op/sdk'
import { describe, expect, it, vi } from 'vitest'

const { getReviewedAdditionalCollaterals } = vi.hoisted(() => ({ getReviewedAdditionalCollaterals: vi.fn(() => []) }))
vi.mock('../aeroMigration/collateralRegistry', () => ({ getReviewedAdditionalCollaterals }))
import { createGeb } from '../geb'

describe('pinned SDK compatibility', () => {
    it('retains every existing token and collateral with no additional configuration', () => {
        const geb = createGeb('mainnet', new ethers.providers.JsonRpcProvider())
        expect(geb.tokenList).toEqual(getTokenList('mainnet'))
        expect(geb.tokenList.HAIVELOV2).toBeDefined()
        expect(geb.tokenList.HAIAERO).toBeDefined()
    })
    it('rejects activation on the real pinned SDK instead of silently ignoring the configuration', () => {
        getReviewedAdditionalCollaterals.mockReturnValueOnce([{}] as never[])
        expect(() => createGeb('mainnet', new ethers.providers.JsonRpcProvider())).toThrow('does not support')
    })
})

import { BigNumber } from 'ethers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getBaseBalance, getOptimismBalance } from './bridgeService'

const { balanceOf } = vi.hoisted(() => ({ balanceOf: vi.fn() }))

vi.mock('~/services/minterProtocol/registry', () => ({
    HAI_AERO_BRIDGE_CONFIG: {
        sourceChain: { rpcUrl: 'https://base.invalid', tokenAddress: '0x1111111111111111111111111111111111111111' },
        destinationChain: {
            rpcUrl: 'https://optimism.invalid',
            tokenAddress: '0x2222222222222222222222222222222222222222',
        },
    },
}))

vi.mock('ethers', async () => {
    const actual = await vi.importActual<typeof import('ethers')>('ethers')
    return {
        ...actual,
        ethers: {
            ...actual.ethers,
            providers: { ...actual.ethers.providers, JsonRpcProvider: vi.fn(() => ({})) },
            Contract: vi.fn(() => ({ balanceOf })),
        },
    }
})

const ACCOUNT = '0x3333333333333333333333333333333333333333'

beforeEach(() => {
    balanceOf.mockReset()
})

describe.each([
    ['Base', getBaseBalance],
    ['Optimism', getOptimismBalance],
] as const)('%s bridge balance', (chain, getBalance) => {
    it('rejects an RPC failure instead of reporting an empty wallet', async () => {
        balanceOf.mockRejectedValue(new Error('RPC unavailable: https://provider.invalid/private-token'))

        await expect(getBalance(ACCOUNT)).rejects.toThrow(
            `Unable to load your haiAERO balance on ${chain}. Please try again.`
        )
    })

    it('preserves a successfully read zero balance', async () => {
        balanceOf.mockResolvedValue(BigNumber.from(0))

        await expect(getBalance(ACCOUNT)).resolves.toEqual({ raw: '0', formatted: '0.0', decimals: 18 })
    })

    it('preserves small funded balances', async () => {
        balanceOf.mockResolvedValue(BigNumber.from('1000000000000000'))

        await expect(getBalance(ACCOUNT)).resolves.toEqual({
            raw: '1000000000000000',
            formatted: '0.001',
            decimals: 18,
        })
    })
})

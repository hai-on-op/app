import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('contracts config env validation', () => {
    const originalEnv = { ...import.meta.env }

    beforeEach(() => {
        // reset module cache to re-run env checks
        vi.resetModules()
        Object.assign(import.meta.env, originalEnv)
    })

    it('throws if required env vars are missing or invalid', async () => {
        Object.assign(import.meta.env, {
            VITE_STAKING_MANAGER: undefined,
            VITE_KITE_ADDRESS: '0x123', // too short
            VITE_STAKING_TOKEN_ADDRESS: 'not-an-address',
            VITE_HAI_ADDRESS: undefined,
            VITE_OP_ADDRESS: undefined,
        })
        await expect(async () => {
            await import('./contracts')
        }).rejects.toThrow()
    })

    it('does not throw when all env vars are valid addresses', async () => {
        Object.assign(import.meta.env, {
            VITE_STAKING_MANAGER: '0x'.padEnd(42, 'a'),
            VITE_KITE_ADDRESS: '0x'.padEnd(42, 'b'),
            VITE_STAKING_TOKEN_ADDRESS: '0x'.padEnd(42, 'c'),
            VITE_HAI_ADDRESS: '0x'.padEnd(42, 'd'),
            VITE_OP_ADDRESS: '0x'.padEnd(42, 'e'),
        })
        const mod = await import('./contracts')
        expect(mod.contracts.tokens.kite).toBeTypeOf('string')
    })
})



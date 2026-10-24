import { beforeEach, describe, expect, it } from 'vitest'
import { pendingMigrationKey, readPendingStep, savePendingStep, type PendingMigrationStep } from './pending'

const values = new Map<string, string>()
const storage: Storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
        values.set(key, value)
    },
    removeItem: (key) => {
        values.delete(key)
    },
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
        return values.size
    },
}

const account = '0x3333333333333333333333333333333333333333'
const key = pendingMigrationKey('route', 10, account)
const step = {
    version: 1,
    kind: 'migration',
    quote: { deploymentId: 'route', chainId: 10, account, inputAmount: '1000', outputAmount: '70' },
    startedAt: 100,
    transactionHash: '0x' + 'a'.repeat(64),
} as PendingMigrationStep

describe('resumable wallet migration', () => {
    beforeEach(() => storage.clear())
    it('retains the exact quote and transaction across refreshes', () => {
        savePendingStep(storage, key, step)
        expect(readPendingStep(storage, key)).toEqual(step)
    })
    it('keeps wallets, chains and deployments isolated', () => {
        savePendingStep(storage, key, step)
        expect(readPendingStep(storage, pendingMigrationKey('route', 8453, account))).toBeUndefined()
        expect(readPendingStep(storage, pendingMigrationKey('other-route', 10, account))).toBeUndefined()
        expect(
            readPendingStep(storage, pendingMigrationKey('route', 10, '0x4444444444444444444444444444444444444444'))
        ).toBeUndefined()
    })
    it('fails closed for corrupt or mismatched saved state', () => {
        storage.setItem(key, '{')
        expect(() => readPendingStep(storage, key)).toThrow('could not be read')
        storage.setItem(key, JSON.stringify({ ...step, quote: { ...step.quote, chainId: 8453 } }))
        expect(() => readPendingStep(storage, key)).toThrow('could not be read')
    })
    it('retains the signing intent even before a hash is returned', () => {
        savePendingStep(storage, key, { ...step, transactionHash: undefined })
        expect(readPendingStep(storage, key)?.kind).toBe('migration')
    })
})

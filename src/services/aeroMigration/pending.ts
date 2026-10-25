import { ethers } from 'ethers'
import type { MigrationQuote } from './service'

export interface PendingMigrationStep {
    version: 1
    kind: 'approval' | 'migration'
    quote: MigrationQuote
    transactionHash?: string
    startedAt: number
}

export function pendingMigrationKey(deploymentId: string, chainId: number, account: string) {
    return `hai-aero-migration:v1:${chainId}:${deploymentId}:${account.toLowerCase()}`
}

/** Corrupt browser state blocks resubmission instead of silently losing a pending transaction. */
export function readPendingStep(storage: Storage, key: string): PendingMigrationStep | undefined {
    const raw = storage.getItem(key)
    if (!raw) return undefined
    try {
        const value = JSON.parse(raw) as PendingMigrationStep
        if (
            value.version !== 1 ||
            !['approval', 'migration'].includes(value.kind) ||
            !value.quote ||
            !ethers.utils.isAddress(value.quote.account) ||
            key !== pendingMigrationKey(value.quote.deploymentId, value.quote.chainId, value.quote.account) ||
            !/^\d+$/.test(value.quote.inputAmount) ||
            !/^\d+$/.test(value.quote.outputAmount) ||
            (value.transactionHash && !/^0x[0-9a-f]{64}$/i.test(value.transactionHash))
        ) {
            throw new Error('Invalid saved transaction')
        }
        return value
    } catch {
        throw new Error(
            'Saved migration progress could not be read. Check your wallet transaction history before continuing.'
        )
    }
}

export function savePendingStep(storage: Storage, key: string, step: PendingMigrationStep) {
    const serialized = JSON.stringify(step)
    storage.setItem(key, serialized)
    if (storage.getItem(key) !== serialized)
        throw new Error('Could not save migration progress. Enable browser storage before continuing.')
}

import { describe, expect, it } from 'vitest'

import { removeDuplicateNamedEvents, sanitizeFactoryDuplicateNamedEvents } from './sanitizeFactoryAbi'

describe('removeDuplicateNamedEvents', () => {
    it('keeps only the last matching event overload', () => {
        const abi = [
            { type: 'event', name: 'TransferCollateral', inputs: [{ type: 'address' }] },
            { type: 'function', name: 'safeData' },
            { type: 'event', name: 'TransferCollateral', inputs: [{ type: 'address' }, { type: 'bytes32' }] },
        ]

        expect(removeDuplicateNamedEvents(abi, 'TransferCollateral')).toEqual([
            { type: 'function', name: 'safeData' },
            { type: 'event', name: 'TransferCollateral', inputs: [{ type: 'address' }, { type: 'bytes32' }] },
        ])
    })

    it('leaves ABIs without duplicate named events unchanged', () => {
        const abi = [
            { type: 'event', name: 'TransferCollateral' },
            { type: 'event', name: 'TransferInternalCoins' },
        ]

        expect(removeDuplicateNamedEvents(abi, 'TransferCollateral')).toBe(abi)
    })
})

describe('sanitizeFactoryDuplicateNamedEvents', () => {
    it('mutates the factory ABI in place so existing references stay valid', () => {
        const abi = [
            { type: 'event', name: 'TransferCollateral', inputs: [{ type: 'address' }] },
            { type: 'event', name: 'TransferCollateral', inputs: [{ type: 'address' }, { type: 'bytes32' }] },
        ]
        const factory = { abi }

        sanitizeFactoryDuplicateNamedEvents(factory, 'TransferCollateral')

        expect(factory.abi).toBe(abi)
        expect(factory.abi).toEqual([
            { type: 'event', name: 'TransferCollateral', inputs: [{ type: 'address' }, { type: 'bytes32' }] },
        ])
    })
})

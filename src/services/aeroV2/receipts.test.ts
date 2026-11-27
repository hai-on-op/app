import { ethers } from 'ethers'
import { describe, expect, it } from 'vitest'

import { MAILBOX_ABI } from './abi'
import { readBridgeMessageId } from './receipts'
import type { AeroV2Quote } from './types'

const account = '0x1111111111111111111111111111111111111111'
const source = '0x2222222222222222222222222222222222222222'
const destination = '0x3333333333333333333333333333333333333333'
const mailbox = '0x4444444444444444444444444444444444444444'
const unrelated = '0x5555555555555555555555555555555555555555'
const abi = new ethers.utils.Interface(MAILBOX_ABI)
const padded = (address: string) => ethers.utils.hexZeroPad(address, 32)
const quote: AeroV2Quote = {
    action: { kind: 'bridge', chainId: 10, amount: '1' },
    account,
    wrapperAddress: source,
    inputWei: ethers.utils.parseEther('1').toString(),
    outputWei: ethers.utils.parseEther('1').toString(),
    nativeFeeWei: '0',
    tokenFeeWei: '0',
    approvals: [],
    sourceMailbox: mailbox,
    destinationWrapperAddress: destination,
    destinationChainId: 8453,
}

function message(
    overrides: {
        origin?: number
        sender?: string
        destination?: number
        router?: string
        recipient?: string
        amount?: string
    } = {}
) {
    return ethers.utils.solidityPack(
        ['uint8', 'uint32', 'uint32', 'bytes32', 'uint32', 'bytes32', 'bytes32', 'uint256'],
        [
            3,
            123,
            overrides.origin ?? 10,
            padded(overrides.sender || source),
            overrides.destination ?? 8453,
            padded(overrides.router || destination),
            padded(overrides.recipient || account),
            overrides.amount || quote.inputWei,
        ]
    )
}

function log(name: string, args: unknown[], address = mailbox) {
    const encoded = abi.encodeEventLog(abi.getEvent(name), args)
    return { address, ...encoded } as ethers.providers.Log
}

function receipt(encodedMessage = message(), emitter = mailbox, id = ethers.utils.keccak256(encodedMessage)) {
    return {
        from: account,
        to: source,
        status: 1,
        logs: [
            log('Dispatch', [source, 8453, padded(destination), encodedMessage], emitter),
            log('DispatchId', [id], emitter),
        ],
    } as ethers.providers.TransactionReceipt
}

describe('confirmed Hyperlane dispatch correlation', () => {
    it('derives the actual message ID from the confirmed Dispatch and DispatchId', () => {
        const encoded = message()
        expect(readBridgeMessageId(receipt(encoded), quote)).toBe(ethers.utils.keccak256(encoded))
    })

    it.each([
        { origin: 8453 },
        { sender: unrelated },
        { destination: 10 },
        { router: unrelated },
        { recipient: unrelated },
        { amount: '1' },
    ])('rejects a dispatched message with a different transfer field %o', (overrides) => {
        expect(() => readBridgeMessageId(receipt(message(overrides)), quote)).toThrow('unique bridge message')
    })

    it('requires the correct mailbox emitter and matching DispatchId', () => {
        expect(() => readBridgeMessageId(receipt(message(), unrelated), quote)).toThrow('unique bridge message')
        expect(() => readBridgeMessageId(receipt(message(), mailbox, ethers.constants.HashZero), quote)).toThrow(
            'unique bridge message'
        )
    })

    it('does not trust transaction events for a failed or unrelated transaction', () => {
        expect(() => readBridgeMessageId({ ...receipt(), status: 0 }, quote)).toThrow('does not match')
        expect(() => readBridgeMessageId({ ...receipt(), from: unrelated }, quote)).toThrow('does not match')
        expect(() => readBridgeMessageId({ ...receipt(), to: unrelated }, quote)).toThrow('does not match')
    })

    it('rejects ambiguous matching dispatches instead of guessing', () => {
        const confirmed = receipt()
        confirmed.logs.push(confirmed.logs[0])
        expect(() => readBridgeMessageId(confirmed, quote)).toThrow('unique bridge message')
    })
})

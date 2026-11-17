import { BigNumber, ethers } from 'ethers'

import { MAILBOX_ABI } from './abi'
import type { AeroV2Quote } from './types'

const mailboxInterface = new ethers.utils.Interface(MAILBOX_ABI)
const same = (left: string, right: string) => left.toLowerCase() === right.toLowerCase()
const bytes32 = (address: string) => ethers.utils.hexZeroPad(address, 32)

export function verifyReceipt(receipt: ethers.providers.TransactionReceipt, account: string, target: string): void {
    if (receipt.status !== 1 || !receipt.to || !same(receipt.to, target) || !same(receipt.from, account)) {
        throw new Error(
            'The confirmed transaction does not match this action. Check its transaction hash before retrying.'
        )
    }
}

export function readBridgeMessageId(receipt: ethers.providers.TransactionReceipt, quote: AeroV2Quote): string {
    verifyReceipt(receipt, quote.account, quote.wrapperAddress)
    if (!quote.sourceMailbox || !quote.destinationWrapperAddress || !quote.destinationChainId) {
        throw new Error('Missing bridge route information.')
    }
    const events = receipt.logs
        .filter((log) => same(log.address, quote.sourceMailbox!))
        .flatMap((log) => {
            try {
                return [mailboxInterface.parseLog(log)]
            } catch {
                return []
            }
        })
    const ids = events.filter((event) => event.name === 'DispatchId').map((event) => event.args.messageId.toLowerCase())
    const matched = events.filter((event) => {
        if (
            event.name !== 'Dispatch' ||
            !same(event.args.sender, quote.wrapperAddress) ||
            !BigNumber.from(event.args.destination).eq(quote.destinationChainId!) ||
            !same(event.args.recipient, bytes32(quote.destinationWrapperAddress!))
        ) {
            return false
        }
        const message: string = event.args.message
        // Hyperlane V3 header (77 bytes) followed by recipient and amount (64 bytes).
        if (ethers.utils.hexDataLength(message) !== 141) return false
        const slice = (start: number, end: number) => ethers.utils.hexDataSlice(message, start, end)
        return (
            BigNumber.from(slice(0, 1)).eq(3) &&
            BigNumber.from(slice(5, 9)).eq(quote.action.chainId) &&
            same(slice(9, 41), bytes32(quote.wrapperAddress)) &&
            BigNumber.from(slice(41, 45)).eq(quote.destinationChainId!) &&
            same(slice(45, 77), bytes32(quote.destinationWrapperAddress!)) &&
            same(slice(77, 109), bytes32(quote.account)) &&
            BigNumber.from(slice(109, 141)).eq(quote.inputWei) &&
            ids.includes(ethers.utils.keccak256(message).toLowerCase())
        )
    })
    if (matched.length !== 1)
        throw new Error('Could not identify a unique bridge message in the confirmed transaction.')
    return ethers.utils.keccak256(matched[0].args.message)
}

import { BigNumber } from 'ethers'

import type { ITransaction } from '~/types'
import { ChainId, ETHERSCAN_PREFIXES } from './constants'

export const IS_IN_IFRAME = window.parent !== window

export const getEtherscanLink = (
    chainId: ChainId | number,
    data: string,
    type: 'transaction' | 'token' | 'address' | 'block'
): string => {
    const prefix = `https://${ETHERSCAN_PREFIXES[chainId as ChainId] || ETHERSCAN_PREFIXES[10]}etherscan.io`

    switch (type) {
        case 'transaction': {
            return `${prefix}/tx/${data}`
        }
        case 'token': {
            return `${prefix}/token/${data}`
        }
        case 'block': {
            return `${prefix}/block/${data}`
        }
        case 'address':
        default: {
            return `${prefix}/address/${data}`
        }
    }
}

export const newTransactionsFirst = (a: ITransaction, b: ITransaction) => {
    return b.addedTime - a.addedTime
}

export const sanitizeDecimals = (val: string, decimals: number) => {
    const formattedValue = val.replace(/[^0-9.]/g, '')
    const [integer, decimal] = formattedValue.split('.')
    const formattedDecimal = decimal ? `.${decimal.slice(0, decimals)}` : ''
    return formattedDecimal ? `${integer}${formattedDecimal}` : integer
}

const CONSERVATIVE_BLOCK_GAS_LIMIT = 10_000_000 // conservative, hard-coded estimate of the current block gas limit
export const DEFAULT_GAS_REQUIRED = 200_000 // the default value for calls that don't specify gasRequired

// chunks array into chunks
// evenly distributes items among the chunks
export function chunkArray<T>(items: T[], gasLimit = CONSERVATIVE_BLOCK_GAS_LIMIT * 10): T[][] {
    const chunks: T[][] = []
    let currentChunk: T[] = []
    let currentChunkCumulativeGas = 0

    for (let i = 0; i < items.length; i++) {
        const item = items[i]

        // calculate the gas required by the current item
        const gasRequired = (item as { gasRequired?: number })?.gasRequired ?? DEFAULT_GAS_REQUIRED

        // if the current chunk is empty, or the current item wouldn't push it over the gas limit,
        // append the current item and increment the cumulative gas
        if (currentChunk.length === 0 || currentChunkCumulativeGas + gasRequired < gasLimit) {
            currentChunk.push(item)
            currentChunkCumulativeGas += gasRequired
        } else {
            // otherwise, push the current chunk and create a new chunk
            chunks.push(currentChunk)
            currentChunk = [item]
            currentChunkCumulativeGas = gasRequired
        }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk)

    return chunks
}

type ArraySortType = 'alphabetical' | 'numerical' | 'parseFloat' | 'parseInt' | 'bigInt' | 'bigNumber'

type SortFn = (a: any, b: any) => number
const sortFnMap: Record<ArraySortType, { desc: SortFn; asc: SortFn }> = {
    alphabetical: {
        desc: (a: string, b: string) => (a.toString() > b.toString() ? 1 : -1),
        asc: (a: string, b: string) => (a.toString() < b.toString() ? 1 : -1),
    },
    numerical: {
        desc: (a: number, b: number) => b - a,
        asc: (a: number, b: number) => a - b,
    },
    parseFloat: {
        desc: (a: string | number, b: string | number) => parseFloat(b.toString()) - parseFloat(a.toString()),
        asc: (a: string | number, b: string | number) => parseFloat(a.toString()) - parseFloat(b.toString()),
    },
    parseInt: {
        desc: (a: string | number, b: string | number) => parseInt(b.toString()) - parseInt(a.toString()),
        asc: (a: string | number, b: string | number) => parseInt(a.toString()) - parseInt(b.toString()),
    },
    bigInt: {
        desc: (a: any, b: any) => (BigInt(b.toString()) < BigInt(a.toString()) ? -1 : 1),
        asc: (a: any, b: any) => (BigInt(a.toString()) < BigInt(b.toString()) ? -1 : 1),
    },
    bigNumber: {
        desc: (a: any, b: any) => (BigNumber.from(b).lt(a) ? -1 : 1),
        asc: (a: any, b: any) => (BigNumber.from(a).lt(b) ? -1 : 1),
    },
}

type ToSortedOptions<T = any> = {
    getProperty?: (obj: T) => any
    type?: ArraySortType
    dir?: 'desc' | 'asc'
    checkValueExists?: boolean
}
export const arrayToSorted = <T = any>(arr: T[], options?: ToSortedOptions<T>) => {
    const {
        getProperty = (obj: T) => obj, // default to returning argument for non-object arrays
        type = 'alphabetical',
        dir = 'desc',
        checkValueExists = false,
    } = options || {}

    const sort = sortFnMap[type][dir]
    return arr.toSorted((a, b) => {
        const aProp = getProperty(a)
        const bProp = getProperty(b)
        if (checkValueExists) {
            if (!bProp) return -1
            if (!aProp) return 1
        }
        return sort(aProp, bProp)
    })
}

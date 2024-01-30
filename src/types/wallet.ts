import { type TransactionResponse } from '@ethersproject/providers'
import { Geb } from '@hai-on-op/sdk'

import { ChainId } from '~/utils'

export type IBlockNumber = {
    [chainId: number]: number
}

export type ITokenBalance = {
    [chainId: number]: number | string
}

export type SerializableTransactionReceipt = {
    to: string
    from: string
    contractAddress: string
    transactionIndex: number
    blockHash: string
    transactionHash: string
    blockNumber: number
    status?: number
}

export type ITransaction = {
    chainId: ChainId
    hash: string
    from: string
    receipt?: SerializableTransactionReceipt
    summary?: string
    lastCheckedBlockNumber?: number
    addedTime: number
    confirmedTime?: number
    originalTx: TransactionResponse
    approval?: {
        tokenAddress: string
        spender: string
    }
}

export type Call = {
    address: string
    callData: string
    gasRequired?: number
}

export type CallListeners = {
    // on a per-chain basis
    [chainId: number]: {
        // stores for each call key the listeners' preferences
        [callKey: string]: {
            // stores how many listeners there are per each blocks per fetch preference
            [blocksPerFetch: number]: number
        }
    }
}

export type CallResults = {
    // on a per-chain basis
    [chainId: number]: {
        [callKey: string]: {
            data?: string | null
            blockNumber?: number
            fetchingBlockNumber?: number
        }
    }
}

export type IFetchTokensDataPayload = {
    geb: Geb
    user: string
    tokens?: string[]
}

export type IVotingTx = {
    id: string
    date: string
    title: string
    text?: string
    endsIn: string
    isCompleted: boolean
    isAbandoned: boolean
}

export type FormattedBalance = {
    e18: string
    raw: string
    formatted: string
}

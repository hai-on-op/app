import { useCallback, useEffect, useRef, useState } from 'react'
import { ethers } from 'ethers'
import { useAccount, useNetwork } from 'wagmi'

import { useEthersSigner } from '~/hooks/useEthersAdapters'
import {
    approveAeroV2,
    checkAeroV2Delivery,
    executeAeroV2,
    getAeroV2Balances,
    getAeroV2Config,
    getAeroV2Nfts,
    quoteAeroV2,
    type AeroV2Action,
} from '~/services/aeroV2'

type Quote = Awaited<ReturnType<typeof quoteAeroV2>>
type Balances = Awaited<ReturnType<typeof getAeroV2Balances>>
type ExecutionResult = Awaited<ReturnType<typeof executeAeroV2>>
type Nfts = Awaited<ReturnType<typeof getAeroV2Nfts>>

export type AeroV2Transaction = ExecutionResult & {
    account: string
    outputWei: string
    createdAt: number
    delivered: boolean
    wrapperAddress: string
    destinationWrapperAddress?: string
}

const STORAGE_PREFIX = 'hai-aero-v2-transactions:'

function readConfig(chainId: 10 | 8453) {
    try {
        return { config: getAeroV2Config(chainId), error: undefined }
    } catch {
        return {
            config: {
                chainId,
                chainName: chainId === 10 ? 'Optimism' : 'Base',
                underlyingSymbol: chainId === 10 ? 'xAERO' : 'AERO',
                wrapperAddress: undefined,
            },
            error: 'haiAERO v2 configuration is unavailable. Transactions are disabled.',
        }
    }
}

function errorMessage(error: unknown): string {
    const value = error as { code?: number | string; reason?: string; message?: string; error?: { code?: number } }
    if (value?.code === 4001 || value?.code === 'ACTION_REJECTED' || value?.error?.code === 4001) {
        return 'Transaction cancelled in your wallet.'
    }
    const message = typeof value?.reason === 'string' ? value.reason : value?.message
    return typeof message === 'string' ? message.slice(0, 400) : 'Unable to complete this request. Please try again.'
}

function readTransactions(account: string): AeroV2Transaction[] {
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_PREFIX + account.toLowerCase()) || '[]')
        if (!Array.isArray(stored)) return []
        return stored.filter((item): item is AeroV2Transaction => {
            if (!item || typeof item !== 'object') return false
            const tx = item as AeroV2Transaction
            return (
                typeof tx.account === 'string' &&
                tx.account.toLowerCase() === account.toLowerCase() &&
                typeof tx.hash === 'string' &&
                /^0x[0-9a-fA-F]{64}$/.test(tx.hash) &&
                (tx.chainId === 10 || tx.chainId === 8453) &&
                ['deposit', 'nft', 'migrate', 'bridge'].includes(tx.kind) &&
                typeof tx.outputWei === 'string' &&
                /^\d+$/.test(tx.outputWei) &&
                typeof tx.createdAt === 'number' &&
                typeof tx.delivered === 'boolean' &&
                (tx.trackingError === undefined || typeof tx.trackingError === 'string') &&
                (tx.sourceWrapperAddress === undefined ||
                    (typeof tx.sourceWrapperAddress === 'string' && ethers.utils.isAddress(tx.sourceWrapperAddress))) &&
                typeof tx.wrapperAddress === 'string' &&
                ethers.utils.isAddress(tx.wrapperAddress) &&
                (tx.destinationWrapperAddress === undefined ||
                    (typeof tx.destinationWrapperAddress === 'string' &&
                        ethers.utils.isAddress(tx.destinationWrapperAddress))) &&
                (tx.destinationMailbox === undefined ||
                    (typeof tx.destinationMailbox === 'string' && ethers.utils.isAddress(tx.destinationMailbox))) &&
                (tx.kind !== 'bridge' ||
                    ((tx.destinationChainId === 10 || tx.destinationChainId === 8453) &&
                        tx.destinationChainId !== tx.chainId &&
                        (tx.messageId === undefined ||
                            (typeof tx.messageId === 'string' && /^0x[0-9a-fA-F]{64}$/.test(tx.messageId)))))
            )
        })
    } catch {
        return []
    }
}

function writeTransactions(account: string, transactions: AeroV2Transaction[]) {
    try {
        localStorage.setItem(STORAGE_PREFIX + account.toLowerCase(), JSON.stringify(transactions))
    } catch {
        // The current session still tracks delivery if browser storage is unavailable.
    }
}

function hasInput(action: AeroV2Action): boolean {
    if (action.kind === 'nft') return Boolean(action.tokenIds?.length)
    try {
        return ethers.utils.parseUnits(action.amount, 18).gt(0)
    } catch {
        return Boolean(action.amount)
    }
}

export function useAeroV2(action: AeroV2Action) {
    const { address } = useAccount()
    const { chain } = useNetwork()
    const signer = useEthersSigner()
    const account = address?.toLowerCase()
    const { config, error: configError } = readConfig(action.chainId)
    const { config: destinationConfig, error: destinationConfigError } = readConfig(action.chainId === 10 ? 8453 : 10)
    const available = Boolean(config.wrapperAddress && (action.kind !== 'bridge' || destinationConfig.wrapperAddress))
    const requestKey = JSON.stringify([
        action,
        account,
        chain?.id,
        config.wrapperAddress,
        destinationConfig.wrapperAddress,
    ])
    const latestKey = useRef(requestKey)
    latestKey.current = requestKey
    const latestAccount = useRef(account)
    latestAccount.current = account
    const mounted = useRef(true)
    const busy = useRef(false)

    const [revision, setRevision] = useState(0)
    const [quoteState, setQuoteState] = useState<{ key: string; quote: Quote }>()
    const [quoteLoading, setQuoteLoading] = useState(false)
    const [balancesState, setBalancesState] = useState<{ key: string; balances: Balances }>()
    const [balancesLoading, setBalancesLoading] = useState(false)
    const [requestError, setRequestError] = useState<{ key: string; message: string }>()
    const [isApproving, setIsApproving] = useState(false)
    const [isExecuting, setIsExecuting] = useState(false)
    const [transactionState, setTransactionState] = useState<{ account?: string; items: AeroV2Transaction[] }>({
        items: [],
    })
    const latestTransactions = useRef(transactionState)
    latestTransactions.current = transactionState
    const [deliveryError, setDeliveryError] = useState<string>()
    const [nftState, setNftState] = useState<{ account: string; items: Nfts }>()
    const [nftsLoading, setNftsLoading] = useState(false)
    const [nftsError, setNftsError] = useState<string>()

    const balanceKey = JSON.stringify([account, action.chainId, config.wrapperAddress])
    const quote = quoteState?.key === requestKey ? quoteState.quote : undefined
    const balances = balancesState?.key === balanceKey ? balancesState.balances : undefined
    const transactions = transactionState.account === account ? transactionState.items : []
    const error =
        configError ||
        (action.kind === 'bridge' ? destinationConfigError : undefined) ||
        (requestError?.key === requestKey ? requestError.message : undefined)
    const nfts = nftState && nftState.account === account ? nftState.items : []

    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
        }
    }, [])

    const refresh = useCallback(() => setRevision((value) => value + 1), [])

    useEffect(() => {
        let cancelled = false
        const enabled = Boolean(account && available && action.kind === 'nft')
        setNftsLoading(enabled)
        setNftsError(undefined)
        if (!enabled || !account) return
        getAeroV2Nfts(account)
            .then((items) => {
                if (!cancelled) setNftState({ account, items })
            })
            .catch(() => {
                if (!cancelled) setNftsError('Unable to list your NFTs. You can enter their IDs below.')
            })
            .finally(() => {
                if (!cancelled) setNftsLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [account, available, action.kind, revision])

    useEffect(() => {
        let cancelled = false
        setBalancesLoading(Boolean(account && available))
        if (!account || !available) return
        getAeroV2Balances(action.chainId, account)
            .then((data) => {
                if (!cancelled) setBalancesState({ key: balanceKey, balances: data })
            })
            .catch((cause: unknown) => {
                if (!cancelled) setRequestError({ key: requestKey, message: errorMessage(cause) })
            })
            .finally(() => {
                if (!cancelled) setBalancesLoading(false)
            })
        return () => {
            cancelled = true
        }
        // The balance request is independent of the entered amount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [balanceKey, available, revision])

    useEffect(() => {
        let cancelled = false
        setQuoteState(undefined)
        setRequestError(undefined)
        const enabled = Boolean(account && available && hasInput(action))
        setQuoteLoading(enabled)
        if (!enabled || !account) return
        const timer = window.setTimeout(() => {
            quoteAeroV2(action, account)
                .then((data) => {
                    if (!cancelled && latestKey.current === requestKey) setQuoteState({ key: requestKey, quote: data })
                })
                .catch((cause: unknown) => {
                    if (!cancelled && latestKey.current === requestKey) {
                        setRequestError({ key: requestKey, message: errorMessage(cause) })
                    }
                })
                .finally(() => {
                    if (!cancelled) setQuoteLoading(false)
                })
        }, 300)
        return () => {
            cancelled = true
            window.clearTimeout(timer)
        }
        // requestKey contains the complete action, account, wallet chain, and configured addresses.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestKey, available, revision])

    useEffect(() => {
        setTransactionState({ account, items: account ? readTransactions(account) : [] })
        setDeliveryError(undefined)
    }, [account])

    useEffect(() => {
        if (!account || transactionState.account !== account) return
        const pending = transactionState.items.filter((tx) => {
            if (tx.kind !== 'bridge' || !tx.messageId || tx.delivered || !tx.destinationChainId) return false
            const source = readConfig(tx.chainId).config.wrapperAddress
            const destination = readConfig(tx.destinationChainId).config.wrapperAddress
            return (
                source?.toLowerCase() === tx.wrapperAddress?.toLowerCase() &&
                destination?.toLowerCase() === tx.destinationWrapperAddress?.toLowerCase()
            )
        })
        if (!pending.length) return
        let cancelled = false
        let timer: ReturnType<typeof setTimeout> | undefined
        const poll = async () => {
            try {
                const delivered = await Promise.all(
                    pending.map(async (tx) => ({ tx, delivered: await checkAeroV2Delivery(tx) }))
                )
                if (cancelled || latestAccount.current !== account) return
                const hashes = new Set(delivered.filter((result) => result.delivered).map((result) => result.tx.hash))
                setDeliveryError(undefined)
                if (hashes.size) {
                    setTransactionState((previous) => {
                        if (previous.account !== account) return previous
                        const items = previous.items.map((tx) =>
                            hashes.has(tx.hash) ? { ...tx, delivered: true } : tx
                        )
                        writeTransactions(account, items)
                        return { account, items }
                    })
                    refresh()
                }
            } catch {
                if (!cancelled)
                    setDeliveryError('Unable to check bridge delivery right now. Your transfer is still being tracked.')
            }
            if (!cancelled) timer = setTimeout(poll, 10000)
        }
        void poll()
        return () => {
            cancelled = true
            if (timer) clearTimeout(timer)
        }
    }, [account, transactionState, refresh])

    const run = useCallback(
        async (approve: boolean) => {
            if (busy.current || !quote || !signer || !account || !available) return
            const operationKey = requestKey
            busy.current = true
            setRequestError(undefined)
            if (approve) setIsApproving(true)
            else setIsExecuting(true)
            try {
                let completed: AeroV2Transaction | undefined
                const [signerAccount, signerChainId] = await Promise.all([signer.getAddress(), signer.getChainId()])
                if (
                    latestKey.current !== operationKey ||
                    signerAccount.toLowerCase() !== account ||
                    signerChainId !== action.chainId ||
                    chain?.id !== action.chainId
                ) {
                    throw new Error('Your wallet or selection changed. Check the details and try again.')
                }
                if (approve) {
                    if (action.kind === 'bridge')
                        throw new Error('Bridging haiAERO v2 does not require token approval.')
                    await approveAeroV2(quote, signer)
                } else {
                    const result = await executeAeroV2(quote, signer)
                    const transaction: AeroV2Transaction = {
                        ...result,
                        account,
                        outputWei: quote.outputWei,
                        createdAt: Date.now(),
                        delivered: false,
                        wrapperAddress: quote.wrapperAddress,
                        destinationWrapperAddress: quote.destinationWrapperAddress,
                    }
                    const existing = [
                        ...(latestTransactions.current.account === account ? latestTransactions.current.items : []),
                        ...readTransactions(account),
                    ]
                    const unique = Array.from(new Map(existing.map((tx) => [`${tx.chainId}:${tx.hash}`, tx])).values())
                    const next = [
                        transaction,
                        ...unique.filter((tx) => tx.hash !== result.hash || tx.chainId !== result.chainId),
                    ]
                    writeTransactions(account, next)
                    if (mounted.current && latestAccount.current === account) {
                        setTransactionState({ account, items: next })
                    }
                    completed = transaction
                }
                if (mounted.current && latestKey.current === operationKey) {
                    setQuoteState(undefined)
                    refresh()
                    return completed
                }
            } catch (cause) {
                if (mounted.current && latestKey.current === operationKey) {
                    setRequestError({ key: operationKey, message: errorMessage(cause) })
                }
            } finally {
                busy.current = false
                if (mounted.current) {
                    setIsApproving(false)
                    setIsExecuting(false)
                }
            }
        },
        [quote, signer, account, available, requestKey, action.chainId, action.kind, chain?.id, refresh]
    )

    return {
        account,
        chainId: chain?.id,
        config,
        available,
        balances,
        balancesLoading,
        quote,
        quoteLoading,
        error,
        isApproving,
        isExecuting,
        approve: () => run(true),
        execute: () => run(false),
        refresh,
        transactions,
        deliveryError,
        nfts,
        nftsLoading,
        nftsError,
    }
}

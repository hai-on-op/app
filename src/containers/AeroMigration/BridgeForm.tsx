import { useEffect, useRef, useState } from 'react'
import { BigNumber, ethers } from 'ethers'
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi'
import { Flex, HaiButton, Text } from '~/styles'
import { Link } from '~/components/Link'
import { useEthersSigner } from '~/hooks/useEthersAdapters'
import { getBaseProvider, getOptimismProvider } from '~/services/hyperlane/bridgeService'
import {
    bridgeEndpoints,
    type NewBridgeDirection,
    type NewHaiAeroBridgeRoute,
} from '~/services/aeroMigration/bridgeRegistry'
import {
    getNewBridgeQuote,
    submitNewBridgeStep,
    extractVerifiedDispatch,
    checkNewBridgeDelivery,
    type NewBridgeQuote,
    type VerifiedDispatch,
} from '~/services/aeroMigration/bridge'

interface BridgeProgress {
    version: 1
    kind: 'approval' | 'bridge'
    quote: NewBridgeQuote
    sourceTransactionHash?: string
    dispatch?: VerifiedDispatch
    scanFrom?: number
}

export function BridgeForm({ route }: { route: NewHaiAeroBridgeRoute }) {
    const { address } = useAccount()
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()
    const [direction, setDirection] = useState<NewBridgeDirection>('base-to-optimism')
    const { source, destination } = bridgeEndpoints(route, direction)
    const signer = useEthersSigner({ chainId: source.chainId })
    const [amount, setAmount] = useState('')
    const [quote, setQuote] = useState<NewBridgeQuote>()
    const [pending, setPending] = useState<BridgeProgress>()
    const [recoveryHash, setRecoveryHash] = useState('')
    const [destinationHash, setDestinationHash] = useState('')
    const [busy, setBusy] = useState(false)
    const [blocked, setBlocked] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const running = useRef(false)
    // One journal for the entire route/account so changing direction cannot hide an in-flight transfer.
    const key = address ? `hai-aero-bridge:v1:${route.id}:${address.toLowerCase()}` : ''
    const activeKey = useRef(key)
    activeKey.current = key
    const request = useRef('')
    request.current = JSON.stringify([key, direction, amount, chain?.id])
    const reviewedRequest = useRef('')
    const providersFor = (transferDirection: NewBridgeDirection) =>
        transferDirection === 'base-to-optimism'
            ? { source: getBaseProvider(), destination: getOptimismProvider() }
            : { source: getOptimismProvider(), destination: getBaseProvider() }
    const explorerFor = (chainId: number) =>
        chainId === 8453 ? 'https://basescan.org' : 'https://optimistic.etherscan.io'
    const chainName = (chainId: number) => (chainId === 8453 ? 'Base' : 'Optimism')

    useEffect(() => {
        setPending(undefined)
        setQuote(undefined)
        setBlocked(false)
        setError('')
        setMessage('')
        if (!key) return
        try {
            const raw = localStorage.getItem(key)
            if (!raw) return
            const saved = JSON.parse(raw) as BridgeProgress
            if (
                saved.version !== 1 ||
                !saved.quote ||
                saved.quote.routeId !== route.id ||
                saved.quote.account !== address?.toLowerCase() ||
                !['approval', 'bridge'].includes(saved.kind) ||
                !['base-to-optimism', 'optimism-to-base'].includes(saved.quote.direction) ||
                (saved.sourceTransactionHash && !/^0x[0-9a-f]{64}$/i.test(saved.sourceTransactionHash))
            )
                throw new Error('Invalid bridge progress')
            setDirection(saved.quote.direction)
            setPending(saved)
        } catch {
            setBlocked(true)
            setError('Saved bridge progress could not be read. Check your wallet and bridge history before continuing.')
        }
    }, [key, route.id, address])
    useEffect(() => {
        setQuote(undefined)
    }, [amount, direction, chain?.id])

    const run = async (operation: () => Promise<void>) => {
        if (running.current) return
        running.current = true
        setBusy(true)
        setError('')
        setMessage('')
        try {
            await operation()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bridge check failed. Do not resend a submitted transfer.')
        } finally {
            running.current = false
            setBusy(false)
        }
    }
    const save = (storageKey: string, progress: BridgeProgress) => {
        const raw = JSON.stringify(progress)
        localStorage.setItem(storageKey, raw)
        if (localStorage.getItem(storageKey) !== raw)
            throw new Error('Enable browser storage to save bridge progress before continuing.')
    }
    const refresh = () =>
        run(async () => {
            setQuote(undefined)
            if (!address) throw new Error('Connect your wallet.')
            const current = request.current
            const next = await getNewBridgeQuote(route.id, direction, amount, address, providersFor(direction))
            if (current === request.current) {
                reviewedRequest.current = current
                setQuote(next)
            }
        })
    const submit = () =>
        run(async () => {
            if (!quote || !signer || !key || pending || blocked || reviewedRequest.current !== request.current)
                throw new Error('Review a current bridge quote first.')
            const currentKey = key
            const progress: BridgeProgress = {
                version: 1,
                kind: BigNumber.from(quote.allowance).lt(quote.amount) ? 'approval' : 'bridge',
                quote,
            }
            try {
                const tx = await submitNewBridgeStep(quote, signer, providersFor(direction), () => {
                    save(currentKey, progress)
                    if (activeKey.current === currentKey) setPending(progress)
                })
                const sent = { ...progress, sourceTransactionHash: tx.hash }
                if (activeKey.current === currentKey) setPending(sent)
                save(currentKey, sent)
            } catch (err) {
                const code = (err as { code?: string | number }).code
                if (code === 'ACTION_REJECTED' || code === 4001) {
                    localStorage.removeItem(currentKey)
                    if (activeKey.current === currentKey) setPending(undefined)
                }
                throw err
            }
            setQuote(undefined)
        })
    const check = () =>
        run(async () => {
            if (!pending || !key) return
            const currentKey = key
            const providers = providersFor(pending.quote.direction)
            const endpoints = bridgeEndpoints(route, pending.quote.direction)
            const txHash = pending.sourceTransactionHash || recoveryHash.trim()
            if (!/^0x[0-9a-f]{64}$/i.test(txHash))
                throw new Error('Enter the source transaction hash from your wallet.')
            const receipt = await providers.source.getTransactionReceipt(txHash)
            if (!receipt || receipt.confirmations < 2) {
                setMessage('Waiting for two confirmations on the source chain. Do not resend the transfer.')
                return
            }
            const expectedTo =
                pending.kind === 'approval' ? endpoints.source.token.address : endpoints.source.router.address
            if (
                receipt.from.toLowerCase() !== pending.quote.account ||
                receipt.to?.toLowerCase() !== expectedTo.toLowerCase()
            )
                throw new Error('Source transaction does not match the saved bridge step.')
            if (pending.kind === 'approval' || receipt.status !== 1) {
                localStorage.removeItem(currentKey)
                if (activeKey.current === currentKey) {
                    setPending(undefined)
                    setQuote(undefined)
                    setMessage(
                        receipt.status === 1
                            ? 'Approval confirmed. Refresh the bridge quote to continue.'
                            : 'Source transaction reverted. No bridge transfer was dispatched. Refresh the quote before retrying.'
                    )
                }
                return
            }
            const dispatch = extractVerifiedDispatch(pending.quote, receipt)
            const dispatched = { ...pending, sourceTransactionHash: txHash, dispatch }
            save(currentKey, dispatched)
            if (activeKey.current === currentKey) setPending(dispatched)
            if (destinationHash && !/^0x[0-9a-f]{64}$/i.test(destinationHash.trim()))
                throw new Error('Enter a valid destination transaction hash or leave it blank.')
            const result = await checkNewBridgeDelivery(
                pending.quote,
                dispatch,
                providers,
                pending.scanFrom,
                destinationHash.trim() || undefined
            )
            if (result.delivered) {
                localStorage.removeItem(currentKey)
                if (activeKey.current === currentKey) {
                    setPending(undefined)
                    setQuote(undefined)
                    setMessage(
                        `Delivery confirmed on ${chainName(
                            endpoints.destination.chainId
                        )}. The destination receipt proves the expected new haiAERO reached your wallet.`
                    )
                }
            } else {
                const waiting = { ...dispatched, scanFrom: result.scanFrom }
                save(currentKey, waiting)
                if (activeKey.current === currentKey) {
                    setPending(waiting)
                    setMessage(
                        'Source transfer is confirmed; destination delivery is not yet verified. Check again later. A timeout does not mean tokens arrived.'
                    )
                }
            }
        })

    return (
        <Flex $column $gap={16}>
            <h2>Bridge new haiAERO</h2>
            <Text>
                This route transfers the new haiAERO between Base and Optimism. Legacy haiAERO uses its existing bridge.
            </Text>
            <label>
                Direction
                <select
                    value={direction}
                    disabled={busy || !!pending}
                    onChange={(e) => setDirection(e.target.value as NewBridgeDirection)}
                >
                    <option value="base-to-optimism">Base → Optimism</option>
                    <option value="optimism-to-base">Optimism → Base</option>
                </select>
            </label>
            {!address && <Text>Connect your wallet using the wallet button to continue.</Text>}
            {address && chain?.id !== source.chainId && !pending && (
                <HaiButton onClick={() => switchNetwork?.(source.chainId)}>
                    Switch to {chainName(source.chainId)}
                </HaiButton>
            )}
            <label>
                New haiAERO amount
                <input
                    value={amount}
                    inputMode="decimal"
                    disabled={busy || !!pending}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </label>
            {!pending && (
                <HaiButton disabled={!address || busy || blocked} onClick={refresh}>
                    Get bridge quote
                </HaiButton>
            )}
            {quote && !pending && (
                <>
                    <Text>
                        Receive {ethers.utils.formatEther(quote.amount)} new haiAERO on {chainName(destination.chainId)}
                        . Bridge fee: {ethers.utils.formatEther(quote.fee)} ETH, plus transaction gas.
                    </Text>
                    <HaiButton disabled={busy || !signer || chain?.id !== source.chainId || blocked} onClick={submit}>
                        {BigNumber.from(quote.allowance).gte(quote.amount)
                            ? 'Bridge new haiAERO'
                            : BigNumber.from(quote.allowance).isZero()
                            ? 'Approve exact bridge amount'
                            : 'Reset existing bridge approval'}
                    </HaiButton>
                </>
            )}
            {pending && (
                <>
                    <Text>
                        {pending.kind === 'approval' ? 'Approval' : 'Bridge transfer'} is pending. Do not submit it
                        again.
                    </Text>
                    {pending.sourceTransactionHash ? (
                        <Link href={`${explorerFor(pending.quote.sourceChainId)}/tx/${pending.sourceTransactionHash}`}>
                            View source transaction
                        </Link>
                    ) : (
                        <>
                            <Text>
                                If signing was interrupted, check wallet history and paste the submitted source
                                transaction hash.
                            </Text>
                            <label>
                                Source transaction hash
                                <input value={recoveryHash} onChange={(e) => setRecoveryHash(e.target.value)} />
                            </label>
                            <HaiButton
                                disabled={busy}
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            'Only clear this step after checking that no transaction was submitted in your wallet history. Never clear a dispatched bridge transfer.'
                                        )
                                    ) {
                                        localStorage.removeItem(key)
                                        setPending(undefined)
                                        setQuote(undefined)
                                    }
                                }}
                            >
                                Clear unsubmitted step
                            </HaiButton>
                        </>
                    )}
                    {pending.dispatch && (
                        <>
                            <Text>Source message verified: {pending.dispatch.messageId}</Text>
                            <Link href={`https://explorer.hyperlane.xyz/message/${pending.dispatch.messageId}`}>
                                View bridge message
                            </Link>
                            <label>
                                Destination transaction hash (optional)
                                <input
                                    value={destinationHash}
                                    onChange={(e) => setDestinationHash(e.target.value)}
                                    placeholder="Paste from bridge explorer to speed up verification"
                                />
                            </label>
                        </>
                    )}
                    <HaiButton disabled={busy} onClick={check}>
                        Check bridge progress
                    </HaiButton>
                </>
            )}
            {busy && <Text role="status">Checking bridge…</Text>}
            {message && <Text role="status">{message}</Text>}
            {error && <Text role="alert">{error}</Text>}
        </Flex>
    )
}

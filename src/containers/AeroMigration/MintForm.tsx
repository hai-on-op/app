import { useEffect, useRef, useState } from 'react'
import { BigNumber, ethers } from 'ethers'
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi'
import { Flex, HaiButton, Text } from '~/styles'
import { Link } from '~/components/Link'
import { useEthersSigner } from '~/hooks/useEthersAdapters'
import { getBaseProvider } from '~/services/hyperlane/bridgeService'
import {
    NEW_AERO_BASE_ADDRESS,
    NEW_SAERO_BASE_ADDRESS,
    type HaiAeroIssuerDeployment,
} from '~/services/aeroMigration/issuerRegistry'
import {
    getHaiAeroMintQuote,
    mintNeedsApproval,
    submitHaiAeroMintStep,
    verifyHaiAeroMintReceipt,
    type HaiAeroMintQuote,
} from '~/services/aeroMigration/issuer'

interface MintProgress {
    version: 1
    quote: HaiAeroMintQuote
    kind: 'approval' | 'mint'
    transactionHash?: string
}

export function MintForm({ issuer }: { issuer: HaiAeroIssuerDeployment }) {
    const { address } = useAccount()
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()
    const signer = useEthersSigner({ chainId: 8453 })
    const [mode, setMode] = useState<'aero' | 'saero'>('aero')
    const [value, setValue] = useState('')
    const [quote, setQuote] = useState<HaiAeroMintQuote>()
    const [pending, setPending] = useState<MintProgress>()
    const [recoveryHash, setRecoveryHash] = useState('')
    const [acknowledged, setAcknowledged] = useState(false)
    const [busy, setBusy] = useState(false)
    const [blocked, setBlocked] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const running = useRef(false)
    const key = address ? `hai-aero-issuer:v1:8453:${issuer.id}:${address.toLowerCase()}` : ''
    const activeKey = useRef(key)
    activeKey.current = key
    const request = useRef('')
    request.current = JSON.stringify([key, mode, value, chain?.id])
    const reviewedRequest = useRef('')

    useEffect(() => {
        setQuote(undefined)
        setPending(undefined)
        setBlocked(false)
        setError('')
        setMessage('')
        setAcknowledged(false)
        if (!key) return
        try {
            const raw = localStorage.getItem(key)
            if (!raw) return
            const saved = JSON.parse(raw) as MintProgress
            if (
                saved.version !== 1 ||
                !saved.quote ||
                saved.quote.issuerId !== issuer.id ||
                saved.quote.chainId !== 8453 ||
                saved.quote.account !== address?.toLowerCase() ||
                !['approval', 'mint'].includes(saved.kind) ||
                (saved.transactionHash && !/^0x[0-9a-f]{64}$/i.test(saved.transactionHash))
            )
                throw new Error('Invalid progress')
            setPending(saved)
        } catch {
            setBlocked(true)
            setError('Saved mint progress could not be read. Check your wallet history before continuing.')
        }
    }, [key, issuer.id, address])
    useEffect(() => {
        setQuote(undefined)
        setAcknowledged(false)
    }, [value, mode, chain?.id])

    const run = async (operation: () => Promise<void>) => {
        if (running.current) return
        running.current = true
        setBusy(true)
        setError('')
        setMessage('')
        try {
            await operation()
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Minting could not be completed. Check your wallet before retrying.'
            )
        } finally {
            running.current = false
            setBusy(false)
        }
    }
    const save = (storageKey: string, progress: MintProgress) => {
        const raw = JSON.stringify(progress)
        localStorage.setItem(storageKey, raw)
        if (localStorage.getItem(storageKey) !== raw)
            throw new Error('Enable browser storage to save mint progress before continuing.')
    }
    const refresh = () =>
        run(async () => {
            setQuote(undefined)
            if (!address) throw new Error('Connect your wallet.')
            const currentRequest = request.current
            const next = await getHaiAeroMintQuote(issuer.id, mode, value, address, getBaseProvider())
            if (request.current === currentRequest) {
                reviewedRequest.current = currentRequest
                setQuote(next)
            }
        })
    const submit = () =>
        run(async () => {
            if (
                !quote ||
                !signer ||
                !key ||
                pending ||
                blocked ||
                !acknowledged ||
                reviewedRequest.current !== request.current
            )
                throw new Error('Review and confirm a current mint quote first.')
            const currentKey = key
            const progress: MintProgress = { version: 1, quote, kind: mintNeedsApproval(quote) ? 'approval' : 'mint' }
            try {
                const tx = await submitHaiAeroMintStep(quote, signer, () => {
                    save(currentKey, progress)
                    if (activeKey.current === currentKey) setPending(progress)
                })
                const submitted = { ...progress, transactionHash: tx.hash }
                if (activeKey.current === currentKey) setPending(submitted)
                save(currentKey, submitted)
            } catch (err) {
                const code = (err as { code?: string | number }).code
                if (code === 4001 || code === 'ACTION_REJECTED') {
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
            const txHash = pending.transactionHash || recoveryHash.trim()
            if (!/^0x[0-9a-f]{64}$/i.test(txHash)) throw new Error('Enter the transaction hash from your wallet.')
            const receipt = await getBaseProvider().getTransactionReceipt(txHash)
            if (!receipt || receipt.confirmations < 2) {
                setMessage('Waiting for two Base confirmations. You can return later to check again.')
                return
            }
            const target =
                pending.kind === 'mint'
                    ? issuer.wrapper.address
                    : pending.quote.mode === 'aero'
                    ? NEW_AERO_BASE_ADDRESS
                    : NEW_SAERO_BASE_ADDRESS
            if (
                receipt.from.toLowerCase() !== pending.quote.account ||
                receipt.to?.toLowerCase() !== target.toLowerCase()
            )
                throw new Error('This transaction does not match the saved mint step.')
            if (receipt.status === 1 && pending.kind === 'mint') verifyHaiAeroMintReceipt(pending.quote, receipt)
            localStorage.removeItem(currentKey)
            if (activeKey.current === currentKey) {
                setPending(undefined)
                setQuote(undefined)
                setMessage(
                    receipt.status !== 1
                        ? 'Transaction reverted. Refresh the quote before retrying.'
                        : pending.kind === 'mint'
                        ? 'Mint confirmed. New haiAERO is in your wallet on Base.'
                        : 'Approval confirmed. Refresh your quote to continue.'
                )
            }
        })

    return (
        <Flex $column $gap={16}>
            <h2>Mint new haiAERO on Base</h2>
            <Text>
                Deposit new AERO or permanent sAERO positions. Each new haiAERO represents one AERO of deposited
                principal.
            </Text>
            <Text>
                Your deposit is permanent. This wrapper does not let you withdraw the underlying AERO or sAERO. Your
                haiAERO tokens remain transferable.
            </Text>
            <Text>
                Backing sAERO positions are held and managed by the HAI treasury Safe, which controls voting, reward
                claims and future migrations.
            </Text>
            <Link href={`https://basescan.org/address/${NEW_AERO_BASE_ADDRESS}`}>Check the new AERO token on Base</Link>
            {!address && <Text>Connect your wallet using the wallet button to continue.</Text>}
            {address && chain?.id !== 8453 && (
                <HaiButton onClick={() => switchNetwork?.(8453)}>Switch to Base</HaiButton>
            )}
            <label>
                Deposit type
                <select
                    value={mode}
                    disabled={busy || !!pending}
                    onChange={(e) => setMode(e.target.value as 'aero' | 'saero')}
                >
                    <option value="aero">New AERO</option>
                    <option value="saero">Permanent sAERO NFTs</option>
                </select>
            </label>
            <label>
                {mode === 'aero' ? 'New AERO amount' : 'sAERO token IDs, separated by commas'}
                <input
                    value={value}
                    disabled={busy || !!pending}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={mode === 'aero' ? '0.0' : '123, 456'}
                />
            </label>
            {!pending && (
                <HaiButton disabled={!address || busy || blocked} onClick={refresh}>
                    Check mint amount
                </HaiButton>
            )}
            {quote && !pending && (
                <>
                    <Text>
                        You receive {ethers.utils.formatEther(quote.outputAmount)} new haiAERO on Base. This quote
                        expires after 60 seconds.
                    </Text>
                    <label>
                        <input
                            type="checkbox"
                            checked={acknowledged}
                            onChange={(e) => setAcknowledged(e.target.checked)}
                        />
                        I understand this deposit is permanent.
                    </label>
                    <HaiButton
                        disabled={busy || !signer || chain?.id !== 8453 || !acknowledged || blocked}
                        onClick={submit}
                    >
                        {!mintNeedsApproval(quote)
                            ? 'Mint new haiAERO'
                            : quote.mode === 'saero'
                            ? `Approve sAERO #${quote.approvalTokenId}`
                            : BigNumber.from(quote.allowance).isZero()
                            ? 'Approve exact new AERO amount'
                            : 'Reset existing new AERO approval'}
                    </HaiButton>
                </>
            )}
            {pending && (
                <>
                    <Text>
                        {pending.kind === 'mint' ? 'Mint' : 'Approval'} is awaiting confirmation. Do not submit it
                        again.
                    </Text>
                    {pending.transactionHash ? (
                        <Link href={`https://basescan.org/tx/${pending.transactionHash}`}>View saved transaction</Link>
                    ) : (
                        <>
                            <Text>
                                Check your wallet history if signing was interrupted. Paste the transaction hash to
                                recover progress.
                            </Text>
                            <label>
                                Transaction hash
                                <input value={recoveryHash} onChange={(e) => setRecoveryHash(e.target.value)} />
                            </label>
                            <HaiButton
                                disabled={busy}
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            'Only clear this step after checking that no transaction was submitted in your wallet history.'
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
                    <HaiButton disabled={busy} onClick={check}>
                        Check mint transaction
                    </HaiButton>
                </>
            )}
            {busy && <Text role="status">Checking mint…</Text>}
            {message && <Text role="status">{message}</Text>}
            {error && <Text role="alert">{error}</Text>}
        </Flex>
    )
}

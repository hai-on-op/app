import { NEW_HAI_AERO_BRIDGE_ROUTES } from '~/services/aeroMigration/bridgeRegistry'
import { BridgeForm } from './BridgeForm'
import { HAI_AERO_ISSUER_DEPLOYMENTS } from '~/services/aeroMigration/issuerRegistry'
import { MintForm } from './MintForm'
import { useEffect, useRef, useState } from 'react'
import { BigNumber, ethers } from 'ethers'
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi'
import styled from 'styled-components'
import { BlurContainer, Flex, HaiButton, Text } from '~/styles'
import { Link } from '~/components/Link'
import { AeroMigrationNotice } from '~/components/AeroMigrationNotice'
import { useEthersSigner } from '~/hooks/useEthersAdapters'
import { getBaseProvider, getOptimismProvider } from '~/services/hyperlane/bridgeService'
import {
    AERO_MIGRATION_DEPLOYMENTS,
    LEGACY_MIGRATION_ASSETS,
    type AeroMigrationDeployment,
    type LegacyAssetId,
} from '~/services/aeroMigration/registry'
import {
    getMigrationQuote,
    submitMigrationStep,
    verifyMigrationReceipt,
    type MigrationQuote,
} from '~/services/aeroMigration/service'
import {
    pendingMigrationKey,
    readPendingStep,
    savePendingStep,
    type PendingMigrationStep,
} from '~/services/aeroMigration/pending'

export function AeroMigrationPage() {
    return (
        <Page>
            <h1>AERO migration</h1>
            {AERO_MIGRATION_DEPLOYMENTS.length === 0 ? (
                <>
                    <AeroMigrationNotice showLink={false} />
                    <Text>
                        The new haiAERO migration contracts and funded conversion routes are not available in this app
                        yet. No migration approval or token transfer is needed now. Conversion amounts will be shown
                        before you approve a migration; legacy haiVELO and haiAERO do not have the same exchange rate.
                    </Text>
                </>
            ) : (
                AERO_MIGRATION_DEPLOYMENTS.map((deployment) => (
                    <MigrationForm key={deployment.id} deployment={deployment} />
                ))
            )}
            {HAI_AERO_ISSUER_DEPLOYMENTS.length === 0 ? (
                <Panel>
                    <h2>Minting with new AERO</h2>
                    <Text>
                        Minting new haiAERO on Base is not open yet. When available, this will accept the new AERO token
                        and eligible permanent sAERO positions. Legacy AERO and veAERO are different assets.
                    </Text>
                </Panel>
            ) : (
                HAI_AERO_ISSUER_DEPLOYMENTS.map((issuer) => (
                    <Panel key={issuer.id}>
                        <MintForm issuer={issuer} />
                    </Panel>
                ))
            )}
            {NEW_HAI_AERO_BRIDGE_ROUTES.length === 0 ? (
                <Panel>
                    <h2>Bridging new haiAERO</h2>
                    <Text>
                        The new haiAERO bridge is not open yet. Existing legacy haiAERO uses its separate bridge. New
                        tokens must use a verified new route when it becomes available.
                    </Text>
                </Panel>
            ) : (
                NEW_HAI_AERO_BRIDGE_ROUTES.map((route) => (
                    <Panel key={route.id}>
                        <BridgeForm route={route} />
                    </Panel>
                ))
            )}
            <Panel>
                <h2>Your existing positions</h2>
                <Text>Wallet tokens, vault collateral and LP positions each need a different migration route.</Text>
                <ul>
                    <li>
                        Wallet haiVELO v1, haiVELO v2, and legacy haiAERO on Base or Optimism: keep your tokens until a
                        route is open for their chain.
                    </li>
                    <li>
                        Vault collateral: continue managing your debt and collateral. A wallet migration does not move a
                        vault or its HAI debt.
                    </li>
                    <li>
                        haiVELO/VELO LP and staked LP: these require a separate liquidity migration. An LP token is not
                        accepted by the wallet converter.
                    </li>
                    <li>
                        Pending bridges and unclaimed rewards: retain your transaction records and use the existing
                        bridge and claim tools.
                    </li>
                </ul>
                <Flex $gap={20} $flexWrap>
                    <Link href="/vaults">Manage vaults</Link>
                    <Link href="/haiAERO">Legacy haiAERO and bridge</Link>
                    <Link href="/stake/hai-velo-velo-lp">Manage staked LP</Link>
                    <Link href="/earn">View rewards</Link>
                </Flex>
            </Panel>
            <Flex $gap={20} $flexWrap>
                <Link href="https://docs.letsgethai.com/using-haivelo">haiVELO documentation</Link>
                <Link href="https://aero.xyz/aero-upgrade/">AERO upgrade information</Link>
            </Flex>
        </Page>
    )
}

function MigrationForm({ deployment }: { deployment: AeroMigrationDeployment }) {
    const { address } = useAccount()
    const { chain } = useNetwork()
    const { switchNetwork } = useSwitchNetwork()
    const signer = useEthersSigner({ chainId: deployment.chainId })
    const [assetId, setAssetId] = useState<LegacyAssetId>(deployment.assets[0])
    const [amount, setAmount] = useState('')
    const [quote, setQuote] = useState<MigrationQuote>()
    const [pending, setPending] = useState<PendingMigrationStep>()
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [busy, setBusy] = useState(false)
    const [storageBlocked, setStorageBlocked] = useState(false)
    const [recoveryHash, setRecoveryHash] = useState('')
    const running = useRef(false)
    const provider = deployment.chainId === 8453 ? getBaseProvider() : getOptimismProvider()
    const network = deployment.chainId === 8453 ? 'Base' : 'Optimism'
    const explorer = deployment.chainId === 8453 ? 'https://basescan.org' : 'https://optimistic.etherscan.io'
    const key = address ? pendingMigrationKey(deployment.id, deployment.chainId, address) : ''
    const activeKey = useRef(key)
    activeKey.current = key
    const quoteRequest = useRef('')
    quoteRequest.current = JSON.stringify([key, assetId, amount, chain?.id])

    useEffect(() => {
        setQuote(undefined)
        setPending(undefined)
        setError('')
        setMessage('')
        setStorageBlocked(false)
        if (key) {
            try {
                setPending(readPendingStep(localStorage, key))
            } catch (err) {
                setError(errorMessage(err))
                setStorageBlocked(true)
            }
        }
    }, [key])

    useEffect(() => {
        setQuote(undefined)
    }, [amount, assetId, chain?.id])

    const run = async (fn: () => Promise<void>) => {
        if (running.current) return
        running.current = true
        setBusy(true)
        setError('')
        setMessage('')
        try {
            await fn()
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            running.current = false
            setBusy(false)
        }
    }

    const refreshQuote = () =>
        run(async () => {
            setQuote(undefined)
            if (!address || !key) throw new Error('Connect your wallet to get a migration quote.')
            const requestedKey = key
            const requestedQuote = quoteRequest.current
            const next = await getMigrationQuote(deployment.id, assetId, amount, address, provider)
            if (activeKey.current === requestedKey && quoteRequest.current === requestedQuote) setQuote(next)
        })

    const send = () =>
        run(async () => {
            if (!quote || !signer || !key || pending || storageBlocked)
                throw new Error('Refresh the quote before continuing.')
            if (
                quote.assetId !== assetId ||
                !ethers.utils.parseUnits(amount, LEGACY_MIGRATION_ASSETS[assetId].decimals).eq(quote.inputAmount)
            ) {
                throw new Error('Amount changed. Refresh the quote before continuing.')
            }
            const requestedKey = key
            // Save the intent before opening the wallet. A refresh during signing must not offer a blind retry.
            const step: PendingMigrationStep = {
                version: 1,
                kind: BigNumber.from(quote.allowance).lt(quote.inputAmount) ? 'approval' : 'migration',
                quote,
                startedAt: Date.now(),
            }
            try {
                const tx = await submitMigrationStep(quote, step.kind, signer, () => {
                    savePendingStep(localStorage, requestedKey, step)
                    if (activeKey.current === requestedKey) setPending(step)
                })
                const submitted = { ...step, transactionHash: tx.hash }
                if (activeKey.current === requestedKey) setPending(submitted)
                savePendingStep(localStorage, requestedKey, submitted)
            } catch (err) {
                const code = (err as { code?: string | number }).code
                if (code === 'ACTION_REJECTED' || code === 4001) {
                    localStorage.removeItem(requestedKey)
                    if (activeKey.current === requestedKey) setPending(undefined)
                }
                throw err
            }
            setQuote(undefined)
        })

    const checkPending = () =>
        run(async () => {
            if (!pending || !key) return
            const requestedKey = key
            const transactionHash = pending.transactionHash || recoveryHash.trim()
            if (!/^0x[0-9a-f]{64}$/i.test(transactionHash))
                throw new Error('Enter the transaction hash from your wallet to check its result.')
            const receipt = await provider.getTransactionReceipt(transactionHash)
            if (!receipt || receipt.confirmations < 2) {
                setMessage('Waiting for two confirmations. Keep this page or return later to check again.')
                return
            }
            const expectedTo =
                pending.kind === 'migration'
                    ? deployment.migrator.address
                    : LEGACY_MIGRATION_ASSETS[pending.quote.assetId].address
            if (
                receipt.from.toLowerCase() !== pending.quote.account ||
                receipt.to?.toLowerCase() !== expectedTo.toLowerCase()
            ) {
                throw new Error('This transaction does not match your saved migration step.')
            }
            if (receipt.status === 1 && pending.kind === 'migration') verifyMigrationReceipt(pending.quote, receipt)
            localStorage.removeItem(requestedKey)
            if (activeKey.current === requestedKey) {
                setPending(undefined)
                setQuote(undefined)
                setMessage(
                    receipt.status !== 1
                        ? 'Transaction reverted. No migration was completed. Refresh the quote before retrying.'
                        : pending.kind === 'migration'
                        ? 'Migration confirmed. Your new haiAERO is in this wallet on ' + network + '.'
                        : 'Approval transaction confirmed. Refresh the quote to continue.'
                )
            }
        })

    return (
        <Panel>
            <h2>Wallet migration on {network}</h2>
            <Text>Receive new haiAERO on {network}. This conversion does not move vault debt or bridge tokens.</Text>
            {!address && <Text>Connect your wallet using the wallet button to continue.</Text>}
            {address && chain?.id !== deployment.chainId && (
                <HaiButton onClick={() => switchNetwork?.(deployment.chainId)}>Switch to {network}</HaiButton>
            )}
            <label>
                Legacy token
                <select
                    value={assetId}
                    disabled={busy || !!pending}
                    onChange={(e) => setAssetId(e.target.value as LegacyAssetId)}
                >
                    {deployment.assets.map((id) => (
                        <option key={id} value={id}>
                            {LEGACY_MIGRATION_ASSETS[id].label}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                Amount
                <input
                    value={amount}
                    inputMode="decimal"
                    disabled={busy || !!pending}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                />
            </label>
            {!pending && (
                <HaiButton onClick={refreshQuote} disabled={!address || busy || storageBlocked}>
                    Get current quote
                </HaiButton>
            )}
            {quote && !pending && (
                <>
                    <Text>
                        You receive at least {ethers.utils.formatUnits(quote.outputAmount, deployment.outputDecimals)}{' '}
                        new haiAERO.
                    </Text>
                    <Text>
                        Quote expires after 60 seconds and is checked again before you sign. Tokens stay on {network}.
                    </Text>
                    <HaiButton
                        disabled={busy || !signer || chain?.id !== deployment.chainId || storageBlocked}
                        onClick={send}
                    >
                        {BigNumber.from(quote.allowance).gte(quote.inputAmount)
                            ? 'Migrate wallet tokens'
                            : BigNumber.from(quote.allowance).isZero()
                            ? 'Approve exact amount'
                            : 'Reset existing approval'}
                    </HaiButton>
                </>
            )}
            {pending && (
                <>
                    <Text>
                        {pending.kind === 'migration' ? 'Migration' : 'Approval'} is awaiting confirmation. Do not
                        submit it again.
                    </Text>
                    {pending.transactionHash ? (
                        <Link href={`${explorer}/tx/${pending.transactionHash}`}>View saved transaction</Link>
                    ) : (
                        <>
                            <Text>
                                If the wallet closed or this page refreshed during signing, check your wallet history.
                                Paste the transaction hash to recover progress.
                            </Text>
                            <label>
                                Transaction hash
                                <input
                                    value={recoveryHash}
                                    onChange={(e) => setRecoveryHash(e.target.value)}
                                    placeholder="0x…"
                                />
                            </label>
                            <HaiButton
                                disabled={busy}
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            'Only clear this step if you checked your wallet history and no transaction was submitted. Clearing a submitted migration can cause a duplicate attempt.'
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
                    <HaiButton disabled={busy} onClick={checkPending}>
                        Check transaction
                    </HaiButton>
                </>
            )}
            {busy && <Text role="status">Checking migration…</Text>}
            {message && <Text role="status">{message}</Text>}
            {error && <Text role="alert">{error}</Text>}
        </Panel>
    )
}

function errorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : 'Migration could not be completed. Check your wallet before retrying.'
}

const Page = styled(BlurContainer).attrs({ $column: true, $gap: 24, $width: '100%' })`
    padding: 32px;
    line-height: 1.5;
    & > * {
        padding: 0;
    }
    & > section {
        padding: 24px;
    }
    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
    `}
    h1,
    h2 {
        margin: 0;
    }
    ul {
        margin: 0;
        padding-left: 24px;
    }
    li + li {
        margin-top: 12px;
    }
`
const Panel = styled(Flex).attrs({ as: 'section', $column: true, $gap: 16, $width: '100%' })`
    padding: 24px;
    border: 1px solid currentColor;
    border-radius: 12px;
    label {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    input,
    select {
        font: inherit;
        padding: 12px;
        border: 1px solid currentColor;
        border-radius: 8px;
    }
`

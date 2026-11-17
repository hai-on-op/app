import { useMemo, useState } from 'react'
import { useSwitchNetwork } from 'wagmi'
import { ethers } from 'ethers'
import styled from 'styled-components'
import { ArrowRight, CheckCircle, Clock } from 'react-feather'

import { LazyConnectButton } from '~/components/LazyConnectButton'
import { NumberInput } from '~/components/NumberInput'
import { SelectInput } from '~/components/SelectInput'
import { StatusLabel } from '~/components/StatusLabel'
import { useAeroV2 } from '~/hooks/minter/useAeroV2'
import { LEGACY_SOURCES, type AeroV2Action, type AeroV2ChainId, type LegacySourceId } from '~/services/aeroV2'
import { Flex, HaiButton, Text } from '~/styles'
import { Status } from '~/utils'

type Mode = 'mint' | 'migrate' | 'bridge'

type AeroV2PanelProps = {
    onLegacyBridge?: () => void
    initialMode?: Mode
    initialSource?: LegacySourceId
}

function formatAmount(wei?: string) {
    if (wei === undefined) return '—'
    try {
        return ethers.utils.formatUnits(wei, 18)
    } catch {
        return '—'
    }
}

function sourceExplorer(chainId: number, hash: string) {
    return `https://${chainId === 8453 ? 'basescan.org' : 'optimistic.etherscan.io'}/tx/${hash}`
}

export function AeroV2Panel({ onLegacyBridge, initialMode = 'mint', initialSource = 'haiVeloV2' }: AeroV2PanelProps) {
    const [mode, setMode] = useState<Mode>(initialMode)
    const [selectedChain, setSelectedChain] = useState<AeroV2ChainId>(8453)
    const [mintAsset, setMintAsset] = useState<'token' | 'nft'>('token')
    const [source, setSource] = useState<LegacySourceId>(initialSource)
    const [amount, setAmount] = useState('')
    const [nftIds, setNftIds] = useState('')
    const [networkError, setNetworkError] = useState<string>()
    const { switchNetworkAsync } = useSwitchNetwork()
    const sourceChainId = mode === 'migrate' ? 10 : selectedChain
    const destinationName = sourceChainId === 8453 ? 'Optimism' : 'Base'
    const isNft = mode === 'mint' && selectedChain === 8453 && mintAsset === 'nft'

    const action = useMemo<AeroV2Action>(
        () => ({
            kind: mode === 'mint' ? (isNft ? 'nft' : 'deposit') : mode,
            chainId: sourceChainId,
            amount,
            ...(mode === 'migrate' ? { source } : {}),
            ...(isNft ? { tokenIds: nftIds.split(/[\s,]+/).filter(Boolean) } : {}),
        }),
        [mode, isNft, sourceChainId, amount, source, nftIds]
    )
    const {
        account,
        chainId,
        config,
        available,
        balances,
        balancesLoading,
        quote,
        quoteLoading,
        error,
        isApproving,
        isExecuting,
        approve,
        execute,
        refresh,
        transactions,
        deliveryError,
        nfts,
        nftsLoading,
        nftsError,
    } = useAeroV2(action)

    const busy = isApproving || isExecuting
    const onCorrectChain = chainId === sourceChainId
    const needsApproval = mode !== 'bridge' && Boolean(quote?.approvals.length)
    const nftApprovals = quote?.approvals.filter((approval) => approval.kind === 'nft') || []
    const amountLabel =
        mode === 'bridge' ? 'Amount to bridge' : mode === 'migrate' ? 'Amount to migrate' : 'Amount to deposit'
    const sourceLabel =
        mode === 'migrate' ? LEGACY_SOURCES[source].label : mode === 'bridge' ? 'haiAERO v2' : config.underlyingSymbol
    const balanceWei =
        mode === 'migrate'
            ? balances?.legacy[source]
            : mode === 'bridge'
            ? balances?.wrappedWei
            : balances?.underlyingWei

    const preview = useMemo(() => {
        if (quote) return formatAmount(quote.outputWei)
        if (isNft || !amount) return '—'
        try {
            const input = ethers.utils.parseUnits(amount, 18)
            if (input.lte(0)) return '—'
            return formatAmount(
                mode === 'migrate' && source !== 'haiAeroV1' ? input.mul(44).div(1000).toString() : input.toString()
            )
        } catch {
            return '—'
        }
    }, [quote, isNft, amount, mode, source])

    const changeMode = (next: Mode) => {
        setMode(next)
        setAmount('')
        setNftIds('')
        setNetworkError(undefined)
    }

    const switchChain = async () => {
        setNetworkError(undefined)
        if (!switchNetworkAsync) {
            setNetworkError(`Switch to ${config.chainName} in your wallet to continue.`)
            return
        }
        try {
            await switchNetworkAsync(sourceChainId)
        } catch {
            setNetworkError('Network switch cancelled or unavailable. You can switch networks in your wallet.')
        }
    }

    const submit = async () => {
        if (needsApproval) {
            await approve()
            return
        }
        const result = await execute()
        if (result) {
            setAmount('')
            setNftIds('')
        }
    }

    const actionLabel =
        mode === 'mint'
            ? 'Mint haiAERO v2'
            : mode === 'migrate'
            ? 'Migrate to haiAERO v2'
            : `Bridge to ${destinationName}`

    return (
        <Container>
            <Introduction>
                <Text as="h2" $fontSize="1.4em" $fontWeight={700}>
                    haiAERO v2
                </Text>
                <Text $fontSize="0.9em">
                    Mint haiAERO on Base or Optimism, or convert your existing haiVELO and haiAERO on Optimism. Deposits
                    go to the treasury and you receive the new tokens on the same chain.
                </Text>
                {import.meta.env.VITE_HAI_AERO_V2_TEST_MODE === 'true' && (
                    <Notice role="status" status={Status.NEUTRAL} background="gradientCooler">
                        Dev contracts on mainnet. Use small test amounts; transactions spend real assets.
                    </Notice>
                )}
                {!available && (
                    <Notice role="status" status={Status.NEUTRAL} background="gradientCooler">
                        haiAERO v2 is not configured for {mode === 'bridge' ? 'both networks' : config.chainName} in
                        this app. You can review the options below; transactions are unavailable.
                    </Notice>
                )}
                <ModeButtons aria-label="haiAERO v2 actions">
                    {(['mint', 'migrate', 'bridge'] as const).map((value) => (
                        <HaiButton
                            key={value}
                            type="button"
                            $variant={mode === value ? 'yellowish' : 'default'}
                            aria-pressed={mode === value}
                            disabled={busy}
                            onClick={() => changeMode(value)}
                        >
                            {value === 'mint' ? 'Mint' : value === 'migrate' ? 'Migrate' : 'Bridge'}
                        </HaiButton>
                    ))}
                </ModeButtons>
            </Introduction>

            <Columns>
                <Summary>
                    <Text $fontWeight={700}>
                        {mode === 'mint'
                            ? 'Mint on either chain'
                            : mode === 'migrate'
                            ? 'Convert existing tokens'
                            : 'Move haiAERO v2 between chains'}
                    </Text>
                    {mode === 'mint' ? (
                        <>
                            <Text>
                                Deposit AERO or sAERO NFTs on Base, or xAERO on Optimism. You receive one haiAERO for
                                each AERO or xAERO deposited.
                            </Text>
                            <Text>
                                An sAERO NFT containing 100 AERO mints 100 haiAERO. Timed and permanent positions are
                                both accepted.
                            </Text>
                            <Text>
                                The treasury manages the underlying tokens and NFTs afterward. This is a one-way
                                deposit.
                            </Text>
                        </>
                    ) : mode === 'migrate' ? (
                        <>
                            <RateTable>
                                <tbody>
                                    <tr>
                                        <th>Existing token</th>
                                        <th>New haiAERO</th>
                                    </tr>
                                    <tr>
                                        <td>1 haiVELO v1 or v2</td>
                                        <td>0.044</td>
                                    </tr>
                                    <tr>
                                        <td>1 haiAERO v1</td>
                                        <td>1</td>
                                    </tr>
                                </tbody>
                            </RateTable>
                            <Text>
                                For example, 1,000 haiVELO converts to 44 haiAERO v2. Your old tokens are retired and
                                the new tokens are minted directly on Optimism.
                            </Text>
                            <Text>
                                Old haiAERO on Base needs to be bridged to Optimism first. Existing vault collateral and
                                debt do not move automatically.
                            </Text>
                            <HaiButton
                                type="button"
                                $variant="blueish"
                                disabled={!onLegacyBridge || busy}
                                onClick={onLegacyBridge}
                            >
                                Bridge old haiAERO to OP <ArrowRight size={16} />
                            </HaiButton>
                        </>
                    ) : (
                        <>
                            <Text>
                                Bridge the new haiAERO v2 between Base and Optimism. The tokens are burned on the source
                                chain and minted on the destination after the bridge message arrives.
                            </Text>
                            <Text>
                                Source-chain confirmation is the first step. Delivery is complete only when the
                                destination confirms that message.
                            </Text>
                            <Text>
                                Use the legacy bridge for old haiAERO. Old and new haiAERO are separate tokens, even
                                though both use the symbol haiAERO.
                            </Text>
                        </>
                    )}
                    <Text $fontSize="0.8em">
                        The new token name is haiAEROV2 and its symbol is haiAERO. Vault support for the new token is
                        separate from this minting and migration flow.
                    </Text>
                </Summary>

                <Card>
                    <CardHeading>
                        <Text $fontWeight={700}>{actionLabel}</Text>
                    </CardHeading>
                    <CardBody>
                        {mode === 'migrate' ? (
                            <Text $fontWeight={600}>Network: Optimism</Text>
                        ) : (
                            <SelectInput<AeroV2ChainId>
                                label={mode === 'bridge' ? 'From network' : 'Minting network'}
                                subLabel={mode === 'bridge' ? `To ${destinationName}` : ''}
                                options={[
                                    { label: 'Base', value: 8453 },
                                    { label: 'Optimism', value: 10 },
                                ]}
                                value={selectedChain}
                                onChange={(value) => {
                                    setSelectedChain(value)
                                    setAmount('')
                                    setNftIds('')
                                    setMintAsset('token')
                                    setNetworkError(undefined)
                                }}
                                disabled={busy}
                            />
                        )}
                        {mode === 'migrate' && (
                            <SelectInput<LegacySourceId>
                                label="Token to migrate"
                                subLabel="On Optimism"
                                options={Object.values(LEGACY_SOURCES).map((item) => ({
                                    label: item.label,
                                    value: item.id,
                                }))}
                                value={source}
                                onChange={(value) => {
                                    setSource(value)
                                    setAmount('')
                                }}
                                disabled={busy}
                            />
                        )}
                        {mode === 'mint' && selectedChain === 8453 && (
                            <SelectInput<'token' | 'nft'>
                                label="Deposit"
                                subLabel="On Base"
                                options={[
                                    { label: 'AERO', value: 'token' },
                                    { label: 'sAERO NFTs', value: 'nft' },
                                ]}
                                value={mintAsset}
                                onChange={(value) => {
                                    setMintAsset(value)
                                    setAmount('')
                                    setNftIds('')
                                }}
                                disabled={busy}
                            />
                        )}
                        {isNft ? (
                            <Flex $column $gap={8}>
                                {nftsLoading && (
                                    <Text role="status" $fontSize="0.8em">
                                        Loading your sAERO NFTs…
                                    </Text>
                                )}
                                {nfts.length > 0 && (
                                    <NftList aria-label="Your sAERO NFTs">
                                        {nfts.map((nft) => (
                                            <NftChoice key={nft.tokenId}>
                                                <input
                                                    type="checkbox"
                                                    checked={action.tokenIds?.includes(nft.tokenId) || false}
                                                    disabled={busy || nft.principalWei === '0'}
                                                    onChange={(event) => {
                                                        const ids = action.tokenIds || []
                                                        setNftIds(
                                                            (event.target.checked
                                                                ? [...ids, nft.tokenId]
                                                                : ids.filter((id) => id !== nft.tokenId)
                                                            ).join(', ')
                                                        )
                                                    }}
                                                />
                                                <span>
                                                    #{nft.tokenId} · {formatAmount(nft.principalWei)} AERO ·{' '}
                                                    {nft.isPermanent ? 'Permanent' : 'Timed'}
                                                </span>
                                            </NftChoice>
                                        ))}
                                    </NftList>
                                )}
                                {nftsError && <Text $fontSize="0.75em">{nftsError}</Text>}
                                <NftLabel htmlFor="aero-v2-nft-ids">sAERO NFT IDs</NftLabel>
                                <NftInput
                                    id="aero-v2-nft-ids"
                                    value={nftIds}
                                    placeholder="For example: 123, 456"
                                    disabled={busy}
                                    onChange={(event) => setNftIds(event.target.value)}
                                />
                                <Text $fontSize="0.75em">
                                    Enter the IDs of NFTs you own, separated by commas. We check their AERO balance
                                    before asking for approval.
                                </Text>
                                {nfts.length >= 50 && (
                                    <Text $fontSize="0.75em">
                                        Showing your first 50 NFTs. You can enter other IDs above.
                                    </Text>
                                )}
                            </Flex>
                        ) : (
                            <NumberInput
                                label={amountLabel}
                                aria-label={amountLabel}
                                subLabel={
                                    balancesLoading ? 'Loading balance…' : `Available: ${formatAmount(balanceWei)}`
                                }
                                unitLabel={sourceLabel}
                                value={amount}
                                min="0"
                                placeholder="0.0"
                                onChange={setAmount}
                                onMax={
                                    !busy && balanceWei !== undefined
                                        ? () => setAmount(formatAmount(balanceWei))
                                        : undefined
                                }
                                disabled={busy}
                            />
                        )}
                        <QuoteBox aria-live="polite">
                            <SummaryRow>
                                <Text>You receive</Text>
                                <Text $fontWeight={700}>{quoteLoading ? 'Checking…' : preview} haiAERO</Text>
                            </SummaryRow>
                            <SummaryRow>
                                <Text>On</Text>
                                <Text>{mode === 'bridge' ? destinationName : config.chainName}</Text>
                            </SummaryRow>
                            {mode === 'bridge' && (
                                <>
                                    <SummaryRow>
                                        <Text>Bridge fee</Text>
                                        <Text>{formatAmount(quote?.nativeFeeWei)} ETH</Text>
                                    </SummaryRow>
                                    <SummaryRow>
                                        <Text>Additional token fee</Text>
                                        <Text>{formatAmount(quote?.tokenFeeWei)} haiAERO</Text>
                                    </SummaryRow>
                                    <Text $fontSize="0.75em">Your wallet will also show the transaction gas cost.</Text>
                                </>
                            )}
                            {isNft && quote && (
                                <Text $fontSize="0.75em">Based on the AERO held in the selected NFTs.</Text>
                            )}
                        </QuoteBox>
                        {account && (
                            <Text $fontSize="0.75em">
                                Your haiAERO v2 balance on {config.chainName}: {formatAmount(balances?.wrappedWei)}
                            </Text>
                        )}
                        {(error || networkError) && (
                            <Notice role="alert" status={Status.NEGATIVE} background="white">
                                {networkError || error}
                            </Notice>
                        )}
                        {isNft && nftApprovals.length > 0 && (
                            <Text role="status" $fontSize="0.8em">
                                {nftApprovals.length} NFT approval{nftApprovals.length === 1 ? '' : 's'} remaining.
                                Approve each selected NFT, then mint in one transaction.
                            </Text>
                        )}
                        {isApproving && (
                            <Text role="status">
                                Confirm the approval in your wallet, then wait for it to be confirmed.
                            </Text>
                        )}
                        {isExecuting && (
                            <Text role="status">
                                Confirm the transaction in your wallet, then wait for source-chain confirmation.
                            </Text>
                        )}
                    </CardBody>
                    <CardFooter>
                        {!available ? (
                            <ActionButton disabled>haiAERO v2 is not available yet</ActionButton>
                        ) : !account ? (
                            <LazyConnectButton $width="100%" $justify="center" />
                        ) : !onCorrectChain ? (
                            <ActionButton onClick={() => void switchChain()} disabled={busy}>
                                Switch to {config.chainName}
                            </ActionButton>
                        ) : (
                            <ActionButton
                                disabled={busy || quoteLoading || !quote || Boolean(error)}
                                onClick={() => void submit()}
                            >
                                {isApproving
                                    ? 'Approving…'
                                    : isExecuting
                                    ? 'Confirming…'
                                    : quoteLoading
                                    ? 'Checking…'
                                    : needsApproval
                                    ? isNft
                                        ? `Approve sAERO NFT #${nftApprovals[0]?.tokenId || '—'}`
                                        : `Approve ${sourceLabel}`
                                    : actionLabel}
                            </ActionButton>
                        )}
                        {available && account && error && (
                            <HaiButton type="button" $size="small" onClick={refresh} disabled={busy}>
                                Refresh quote
                            </HaiButton>
                        )}
                    </CardFooter>
                </Card>
            </Columns>

            {transactions.length > 0 && (
                <History aria-label="haiAERO v2 transactions">
                    <Text $fontWeight={700}>Your recent transactions</Text>
                    {transactions.slice(0, 8).map((tx) => {
                        const pending = tx.kind === 'bridge' && !tx.delivered
                        const sourceName = tx.chainId === 8453 ? 'Base' : 'Optimism'
                        const destName = tx.destinationChainId === 8453 ? 'Base' : 'Optimism'
                        return (
                            <TransactionCard key={`${tx.chainId}:${tx.hash}`}>
                                <Flex $align="center" $gap={8}>
                                    {pending ? <Clock size={18} /> : <CheckCircle size={18} />}
                                    <Text $fontWeight={600}>
                                        {tx.kind === 'bridge'
                                            ? tx.delivered
                                                ? `Delivered to ${destName}`
                                                : `Confirmed on ${sourceName}; ${
                                                      tx.messageId ? 'delivery pending' : 'delivery not verified'
                                                  }`
                                            : `${
                                                  tx.kind === 'migrate' ? 'Migration' : 'Mint'
                                              } confirmed on ${sourceName}`}
                                    </Text>
                                </Flex>
                                <Text $fontSize="0.85em">{formatAmount(tx.outputWei)} haiAERO</Text>
                                <ExplorerLink
                                    href={sourceExplorer(tx.chainId, tx.hash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    View source transaction
                                </ExplorerLink>
                                {tx.messageId && (
                                    <ExplorerLink
                                        href={`https://explorer.hyperlane.xyz/message/${tx.messageId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        View bridge message
                                    </ExplorerLink>
                                )}
                                {tx.trackingError && <Text $fontSize="0.75em">{tx.trackingError}</Text>}
                                {pending && tx.messageId && (
                                    <Text $fontSize="0.75em">
                                        You can leave this page. We will keep checking this message when you return with
                                        the same wallet.
                                    </Text>
                                )}
                            </TransactionCard>
                        )
                    })}
                    {deliveryError && (
                        <Text role="status" $fontSize="0.85em">
                            {deliveryError}
                        </Text>
                    )}
                </History>
            )}
        </Container>
    )
}

const Container = styled.div`
    width: 100%;
    min-width: 0;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 16px;
    `}
`
const Introduction = styled(Flex)`
    flex-direction: column;
    gap: 20px;
    margin-bottom: 28px;
    h2 {
        margin: 0;
    }
`
const ModeButtons = styled(Flex)`
    gap: 10px;
    flex-wrap: wrap;
`
const Columns = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 28px;
    align-items: start;
    @media (max-width: 900px) {
        grid-template-columns: minmax(0, 1fr);
    }
`
const Summary = styled(Flex)`
    flex-direction: column;
    gap: 20px;
    font-size: 0.9rem;
    line-height: 1.6;
    min-width: 0;
`
const Card = styled.div`
    min-width: 0;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 24px;
    overflow: hidden;
`
const CardHeading = styled.div`
    padding: 20px 24px;
    border-bottom: ${({ theme }) => theme.border.medium};
`
const CardBody = styled(Flex)`
    flex-direction: column;
    gap: 22px;
    padding: 24px;
    @media (max-width: 500px) {
        padding: 18px;
    }
`
const CardFooter = styled(Flex)`
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 0 24px 24px;
`
const ActionButton = styled(HaiButton).attrs({
    type: 'button',
    $variant: 'yellowish',
    $width: '100%',
    $justify: 'center',
})`
    white-space: normal;
    min-height: 44px;
`
const Notice = styled(StatusLabel)<{ role?: 'status' | 'alert' }>`
    border-radius: 12px;
    line-height: 1.5;
`
const QuoteBox = styled(Flex)`
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    background: rgba(0, 0, 0, 0.04);
    border-radius: 12px;
    font-size: 0.85rem;
`
const SummaryRow = styled(Flex)`
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    overflow-wrap: anywhere;
`
const RateTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    th,
    td {
        padding: 10px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    }
    th:last-child,
    td:last-child {
        text-align: right;
    }
`
const NftLabel = styled.label`
    font-size: 0.75rem;
    font-weight: 700;
`
const NftList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 240px;
    overflow-y: auto;
`
const NftChoice = styled.label`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 0.8rem;
    cursor: pointer;
    input {
        margin-top: 4px;
    }
`
const NftInput = styled.input`
    width: 100%;
    min-height: 46px;
    padding: 12px 16px;
    border: ${({ theme }) => theme.border.medium};
    border-radius: 8px;
    background: transparent;
    font: inherit;
`
const History = styled(Flex)`
    flex-direction: column;
    gap: 16px;
    margin-top: 32px;
`
const TransactionCard = styled(Flex)`
    flex-direction: column;
    gap: 8px;
    padding: 18px;
    border: ${({ theme }) => theme.border.thin};
    border-radius: 12px;
    overflow-wrap: anywhere;
`
const ExplorerLink = styled.a`
    font-size: 0.8rem;
    color: inherit;
    text-decoration: underline;
`

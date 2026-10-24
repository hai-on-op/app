import { verifyContractCode } from './deployment'
import { BigNumber, ethers } from 'ethers'
import { getReviewedIssuer } from './issuerRegistry'
import { LEGACY_MIGRATION_ASSETS } from './registry'
import { verifyContractEvidence } from './service'
import {
    bridgeEndpoints,
    getReviewedBridgeRoute,
    type NewBridgeDirection,
    type NewHaiAeroBridgeEndpoint,
    type NewHaiAeroBridgeRoute,
} from './bridgeRegistry'

// Message offsets and event signatures follow Hyperlane's Message.sol, TokenMessage.sol and IMailbox.sol.
export const MAILBOX_ABI = [
    'function localDomain() view returns (uint32)',
    'function defaultIsm() view returns (address)',
    'function delivered(bytes32) view returns (bool)',
    'event Dispatch(address indexed sender,uint32 indexed destination,bytes32 indexed recipient,bytes message)',
    'event DispatchId(bytes32 indexed messageId)',
    'event ProcessId(bytes32 indexed messageId)',
    'event Process(uint32 indexed origin,bytes32 indexed sender,address indexed recipient)',
]
export const NEW_ROUTER_ABI = [
    'function mailbox() view returns (address)',
    'function interchainSecurityModule() view returns (address)',
    'function routers(uint32) view returns (bytes32)',
    'function token() view returns (address)',
    'function scaleNumerator() view returns (uint256)',
    'function scaleDenominator() view returns (uint256)',
    'function quoteTransferRemote(uint32,bytes32,uint256) view returns (tuple(address token,uint256 amount)[])',
    'function transferRemote(uint32,bytes32,uint256) payable returns (bytes32)',
    'event ReceivedTransferRemote(uint32 indexed origin,bytes32 indexed recipient,uint256 amountOrId)',
]
const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'event Transfer(address indexed from,address indexed to,uint256 value)',
]
const bytes32 = (address: string) => ethers.utils.hexZeroPad(address, 32).toLowerCase()
const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export type BridgeProviders = { source: ethers.providers.Provider; destination: ethers.providers.Provider }
export interface NewBridgeQuote {
    routeId: string
    direction: NewBridgeDirection
    account: string
    sourceChainId: number
    amount: string
    fee: string
    allowance: string
    destinationScanFrom: number
    expiresAt: number
}
export interface VerifiedDispatch {
    sourceTransactionHash: string
    messageId: string
    message: string
}

async function verifyEndpoint(
    endpoint: NewHaiAeroBridgeEndpoint,
    remote: NewHaiAeroBridgeEndpoint,
    provider: ethers.providers.Provider
) {
    if ((await provider.getNetwork()).chainId !== endpoint.chainId) throw new Error('Bridge RPC is on the wrong chain.')
    const block = await provider.getBlockNumber()
    await Promise.all(
        [endpoint.router, endpoint.token, endpoint.mailbox, endpoint.ism].map((identity) =>
            verifyContractCode(identity, provider, block)
        )
    )
    await verifyContractEvidence(endpoint.router, provider, block)
    const activation = await provider.getTransactionReceipt(endpoint.activationTransactionHash)
    if (!activation || activation.status !== 1 || activation.confirmations < 2)
        throw new Error('Bridge activation is not confirmed.')
    const router = new ethers.Contract(endpoint.router.address, NEW_ROUTER_ABI, provider)
    const mailbox = new ethers.Contract(endpoint.mailbox.address, MAILBOX_ABI, provider)
    const token = new ethers.Contract(endpoint.token.address, ERC20_ABI, provider)
    const overrides = { blockTag: block }
    const [
        routerMailbox,
        routerIsm,
        remoteRouter,
        routerToken,
        numerator,
        denominator,
        localDomain,
        defaultIsm,
        decimals,
    ] = await Promise.all([
        router.mailbox(overrides),
        router.interchainSecurityModule(overrides),
        router.routers(remote.domain, overrides),
        router.token(overrides),
        router.scaleNumerator(overrides),
        router.scaleDenominator(overrides),
        mailbox.localDomain(overrides),
        mailbox.defaultIsm(overrides),
        token.decimals(overrides),
    ])
    const effectiveIsm = sameAddress(routerIsm, ethers.constants.AddressZero) ? defaultIsm : routerIsm
    if (
        !sameAddress(routerMailbox, endpoint.mailbox.address) ||
        !sameAddress(routerIsm, endpoint.routerIsmAddress) ||
        !sameAddress(effectiveIsm, endpoint.ism.address) ||
        remoteRouter.toLowerCase() !== bytes32(remote.router.address) ||
        !sameAddress(routerToken, endpoint.token.address) ||
        Number(localDomain) !== endpoint.domain ||
        !BigNumber.from(numerator).eq(1) ||
        !BigNumber.from(denominator).eq(1) ||
        Number(decimals) !== 18
    )
        throw new Error('Bridge token, mailbox, remote router, scale or security module changed.')
    return { router, token, block }
}

export async function verifyNewBridgeRoute(
    route: NewHaiAeroBridgeRoute,
    direction: NewBridgeDirection,
    providers: BridgeProviders
) {
    const issuer = getReviewedIssuer(route.issuerId)
    if (
        route.version !== 'hyperlane-tokenrouter-unscaled-v3' ||
        !/^[0-9a-f]{40}$/i.test(route.contractsCommit) ||
        route.base.chainId !== 8453 ||
        route.base.domain !== 8453 ||
        route.base.kind !== 'collateral' ||
        route.optimism.chainId !== 10 ||
        route.optimism.domain !== 10 ||
        route.optimism.kind !== 'synthetic' ||
        !sameAddress(route.base.token.address, issuer.wrapper.address) ||
        !sameAddress(route.optimism.router.address, route.optimism.token.address)
    )
        throw new Error('Invalid reviewed new haiAERO bridge route.')
    for (const endpoint of [route.base, route.optimism]) {
        if (
            Object.values(LEGACY_MIGRATION_ASSETS).some(
                (legacy) => legacy.chainId === endpoint.chainId && sameAddress(legacy.address, endpoint.token.address)
            )
        )
            throw new Error('A legacy token cannot be used as the new haiAERO bridge token.')
    }
    const { source, destination } = bridgeEndpoints(route, direction)
    const [sourceState, destinationState] = await Promise.all([
        verifyEndpoint(source, destination, providers.source),
        verifyEndpoint(destination, source, providers.destination),
    ])
    return { source, destination, sourceState, destinationState }
}

export async function getNewBridgeQuote(
    routeId: string,
    direction: NewBridgeDirection,
    amount: string,
    account: string,
    providers: BridgeProviders
): Promise<NewBridgeQuote> {
    const route = getReviewedBridgeRoute(routeId)
    if (
        !ethers.utils.isAddress(account) ||
        account === ethers.constants.AddressZero ||
        !/^\d+(\.\d+)?$/.test(amount.trim())
    )
        throw new Error('Connect your wallet and enter a valid amount.')
    const value = ethers.utils.parseEther(amount)
    if (value.lte(0)) throw new Error('Enter an amount greater than zero.')
    const { source, destination, sourceState, destinationState } = await verifyNewBridgeRoute(
        route,
        direction,
        providers
    )
    const overrides = { blockTag: sourceState.block }
    const [fees, balance, allowance, eth] = await Promise.all([
        sourceState.router.quoteTransferRemote(destination.domain, bytes32(account), value, overrides),
        sourceState.token.balanceOf(account, overrides),
        sourceState.token.allowance(account, source.router.address, overrides),
        providers.source.getBalance(account, sourceState.block),
    ])
    let nativeFee = BigNumber.from(0)
    let tokenCharge = BigNumber.from(0)
    for (const fee of fees) {
        if (sameAddress(fee.token, ethers.constants.AddressZero)) nativeFee = nativeFee.add(fee.amount)
        else if (sameAddress(fee.token, source.token.address)) tokenCharge = tokenCharge.add(fee.amount)
        else if (!BigNumber.from(fee.amount).isZero()) throw new Error('This bridge fee token is not supported.')
    }
    if (!tokenCharge.eq(value))
        throw new Error('This route charges token fees and needs a separately reviewed integration.')
    if (value.gt(balance) || nativeFee.gt(eth))
        throw new Error('Insufficient new haiAERO or ETH for the bridge transfer.')
    return {
        routeId,
        direction,
        account: account.toLowerCase(),
        sourceChainId: source.chainId,
        amount: value.toString(),
        fee: nativeFee.toString(),
        allowance: source.kind === 'synthetic' ? value.toString() : allowance.toString(),
        destinationScanFrom: Math.max(0, destinationState.block - 2),
        expiresAt: Date.now() + 60_000,
    }
}

export async function submitNewBridgeStep(
    quote: NewBridgeQuote,
    signer: ethers.Signer,
    providers: BridgeProviders,
    beforeSubmit?: () => void
) {
    if (!signer.provider || Date.now() >= quote.expiresAt)
        throw new Error('Bridge quote expired. Refresh it before continuing.')
    const account = await signer.getAddress()
    if (!sameAddress(account, quote.account) || (await signer.getChainId()) !== quote.sourceChainId)
        throw new Error('Wallet or network changed.')
    const route = getReviewedBridgeRoute(quote.routeId)
    const { source, destination } = bridgeEndpoints(route, quote.direction)
    const fresh = await getNewBridgeQuote(
        quote.routeId,
        quote.direction,
        ethers.utils.formatEther(quote.amount),
        account,
        { ...providers, source: signer.provider }
    )
    if (
        fresh.fee !== quote.fee ||
        BigNumber.from(fresh.allowance).lt(fresh.amount) !== BigNumber.from(quote.allowance).lt(quote.amount)
    )
        throw new Error('Bridge fee or approval changed. Review a fresh quote.')
    if (BigNumber.from(fresh.allowance).lt(fresh.amount)) {
        beforeSubmit?.()
        return new ethers.Contract(source.token.address, ERC20_ABI, signer).approve(
            source.router.address,
            BigNumber.from(fresh.allowance).isZero() ? fresh.amount : 0
        )
    }
    const router = new ethers.Contract(source.router.address, NEW_ROUTER_ABI, signer)
    // Simulation is only a revert check. Its guessed nonce/message ID is NEVER persisted or used as delivery evidence.
    await router.callStatic.transferRemote(destination.domain, bytes32(account), fresh.amount, { value: fresh.fee })
    beforeSubmit?.()
    return router.transferRemote(destination.domain, bytes32(account), fresh.amount, { value: fresh.fee })
}

export function extractVerifiedDispatch(
    quote: NewBridgeQuote,
    receipt: ethers.providers.TransactionReceipt
): VerifiedDispatch {
    const route = getReviewedBridgeRoute(quote.routeId)
    const { source, destination } = bridgeEndpoints(route, quote.direction)
    if (
        receipt.status !== 1 ||
        !sameAddress(receipt.from, quote.account) ||
        !receipt.to ||
        !sameAddress(receipt.to, source.router.address)
    )
        throw new Error('Source transaction does not match this bridge transfer.')
    const mailboxAbi = new ethers.utils.Interface(MAILBOX_ABI)
    const dispatches: VerifiedDispatch[] = []
    const emittedIds = new Set<string>()
    for (const log of receipt.logs) {
        if (!sameAddress(log.address, source.mailbox.address)) continue
        let event: ethers.utils.LogDescription
        try {
            event = mailboxAbi.parseLog(log)
        } catch {
            continue
        }
        if (event.name === 'DispatchId') emittedIds.add(event.args.messageId.toLowerCase())
        if (event.name !== 'Dispatch' || !sameAddress(event.args.sender, source.router.address)) continue
        const message = event.args.message as string
        // This adapter is explicitly unscaled ERC20 with empty metadata: 77-byte header + 64-byte token body.
        if (
            ethers.utils.hexDataLength(message) !== 141 ||
            !BigNumber.from(ethers.utils.hexDataSlice(message, 0, 1)).eq(3) ||
            Number(event.args.destination) !== destination.domain ||
            event.args.recipient.toLowerCase() !== bytes32(destination.router.address) ||
            !BigNumber.from(ethers.utils.hexDataSlice(message, 5, 9)).eq(source.domain) ||
            ethers.utils.hexDataSlice(message, 9, 41).toLowerCase() !== bytes32(source.router.address) ||
            !BigNumber.from(ethers.utils.hexDataSlice(message, 41, 45)).eq(destination.domain) ||
            ethers.utils.hexDataSlice(message, 45, 77).toLowerCase() !== bytes32(destination.router.address) ||
            ethers.utils.hexDataSlice(message, 77, 109).toLowerCase() !== bytes32(quote.account) ||
            !BigNumber.from(ethers.utils.hexDataSlice(message, 109, 141)).eq(quote.amount)
        )
            throw new Error('Dispatched bridge message does not match the reviewed recipient, domains and amount.')
        dispatches.push({
            sourceTransactionHash: receipt.transactionHash,
            message,
            messageId: ethers.utils.keccak256(message),
        })
    }
    if (dispatches.length !== 1 || !emittedIds.has(dispatches[0].messageId.toLowerCase()))
        throw new Error('No unique matching Mailbox Dispatch and DispatchId found. Do not resend this transfer.')
    return dispatches[0]
}

export function verifyDestinationReceipt(
    quote: NewBridgeQuote,
    dispatch: VerifiedDispatch,
    receipt: ethers.providers.TransactionReceipt
) {
    const { source, destination } = bridgeEndpoints(getReviewedBridgeRoute(quote.routeId), quote.direction)
    if (receipt.status !== 1 || receipt.confirmations < 2) throw new Error('Destination transaction is not confirmed.')
    const mailboxAbi = new ethers.utils.Interface(MAILBOX_ABI)
    const tokenAbi = new ethers.utils.Interface(ERC20_ABI)
    const routerAbi = new ethers.utils.Interface(NEW_ROUTER_ABI)
    let processedId = false,
        processedRoute = false,
        transferred = false,
        received = false
    for (const log of receipt.logs) {
        try {
            if (sameAddress(log.address, destination.mailbox.address)) {
                const event = mailboxAbi.parseLog(log)
                if (event.name === 'ProcessId' && sameAddress(event.args.messageId, dispatch.messageId))
                    processedId = true
                if (
                    event.name === 'Process' &&
                    Number(event.args.origin) === source.domain &&
                    event.args.sender.toLowerCase() === bytes32(source.router.address) &&
                    sameAddress(event.args.recipient, destination.router.address)
                )
                    processedRoute = true
            }
            if (
                sameAddress(log.address, destination.token.address) &&
                log.topics[0] === tokenAbi.getEventTopic('Transfer')
            ) {
                const event = tokenAbi.parseLog(log)
                const expectedFrom =
                    destination.kind === 'synthetic' ? ethers.constants.AddressZero : destination.router.address
                if (
                    sameAddress(event.args.from, expectedFrom) &&
                    sameAddress(event.args.to, quote.account) &&
                    event.args.value.eq(quote.amount)
                )
                    transferred = true
            }
            if (
                sameAddress(log.address, destination.router.address) &&
                log.topics[0] === routerAbi.getEventTopic('ReceivedTransferRemote')
            ) {
                const event = routerAbi.parseLog(log)
                if (
                    Number(event.args.origin) === source.domain &&
                    event.args.recipient.toLowerCase() === bytes32(quote.account) &&
                    event.args.amountOrId.eq(quote.amount)
                )
                    received = true
            }
        } catch {
            /* Unrelated logs cannot establish delivery. */
        }
    }
    if (!processedId || !processedRoute || !transferred || !received)
        throw new Error('Destination receipt does not prove this message delivered the expected tokens.')
}

export async function checkNewBridgeDelivery(
    quote: NewBridgeQuote,
    dispatch: VerifiedDispatch,
    providers: BridgeProviders,
    scanFrom = quote.destinationScanFrom,
    destinationTransactionHash?: string
) {
    const route = getReviewedBridgeRoute(quote.routeId)
    const { destination, destinationState } = await verifyNewBridgeRoute(route, quote.direction, providers)
    // Browser persistence is not evidence: reconstruct the message from the confirmed source receipt every time.
    const sourceReceipt = await providers.source.getTransactionReceipt(dispatch.sourceTransactionHash)
    if (!sourceReceipt || sourceReceipt.confirmations < 2)
        throw new Error('Source bridge transaction is not confirmed.')
    const verified = extractVerifiedDispatch(quote, sourceReceipt)
    if (
        !sameAddress(verified.messageId, dispatch.messageId) ||
        verified.message.toLowerCase() !== dispatch.message.toLowerCase()
    )
        throw new Error('Saved bridge message does not match the source receipt.')
    const mailbox = new ethers.Contract(destination.mailbox.address, MAILBOX_ABI, providers.destination)
    if (!(await mailbox.delivered(verified.messageId))) return { delivered: false, scanFrom }
    let transactionHash = destinationTransactionHash
    let nextScanFrom = scanFrom
    if (!transactionHash) {
        // Bounded scans, resumable across page reloads. Never replace delivery evidence with a timeout/balance change.
        const toBlock = Math.min(destinationState.block, scanFrom + 1999)
        if (toBlock < scanFrom) return { delivered: false, scanFrom }
        const logs = await providers.destination.getLogs({
            address: destination.mailbox.address,
            topics: [ethers.utils.id('ProcessId(bytes32)'), verified.messageId],
            fromBlock: scanFrom,
            toBlock,
        })
        transactionHash = logs[0]?.transactionHash
        nextScanFrom = toBlock + 1
    }
    if (!transactionHash) return { delivered: false, scanFrom: nextScanFrom }
    const receipt = await providers.destination.getTransactionReceipt(transactionHash)
    if (!receipt || receipt.confirmations < 2) return { delivered: false, scanFrom }
    verifyDestinationReceipt(quote, verified, receipt)
    return { delivered: true, scanFrom, destinationTransactionHash: transactionHash }
}

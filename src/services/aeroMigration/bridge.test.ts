import { BigNumber, ethers } from 'ethers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NewHaiAeroBridgeEndpoint, NewHaiAeroBridgeRoute } from './bridgeRegistry'

const { contracts, getReviewedBridgeRoute, getReviewedIssuer } = vi.hoisted(() => ({
    contracts: {} as Record<string, any>,
    getReviewedBridgeRoute: vi.fn(),
    getReviewedIssuer: vi.fn(),
}))
vi.mock('ethers', async () => {
    const original = await vi.importActual<any>('ethers')
    return {
        ...original,
        ethers: { ...original.ethers, Contract: vi.fn((address: string) => contracts[address.toLowerCase()]) },
    }
})
vi.mock('./bridgeRegistry', async () => ({
    ...(await vi.importActual<any>('./bridgeRegistry')),
    getReviewedBridgeRoute,
}))
vi.mock('./issuerRegistry', () => ({ getReviewedIssuer }))
vi.mock('./service', () => ({ verifyContractEvidence: vi.fn() }))

import {
    checkNewBridgeDelivery,
    extractVerifiedDispatch,
    getNewBridgeQuote,
    MAILBOX_ABI,
    NEW_ROUTER_ABI,
    submitNewBridgeStep,
    verifyDestinationReceipt,
    verifyNewBridgeRoute,
    type NewBridgeQuote,
} from './bridge'

const address = (char: string) => '0x' + char.repeat(40)
const hash = (char: string) => '0x' + char.repeat(64)
const code = '0x60006000'
const identity = (char: string) => ({ address: address(char), runtimeCodeHash: ethers.utils.keccak256(code) })
const routerIdentity = (char: string) => ({
    ...identity(char),
    deploymentTransactionHash: hash(char),
    deploymentBlockHash: hash(char),
    deploymentBlockNumber: 90,
})
const base: NewHaiAeroBridgeEndpoint = {
    chainId: 8453,
    domain: 8453,
    kind: 'collateral',
    token: identity('1'),
    router: routerIdentity('2'),
    mailbox: identity('3'),
    ism: identity('4'),
    routerIsmAddress: address('4'),
    activationTransactionHash: hash('b'),
}
const optimism: NewHaiAeroBridgeEndpoint = {
    chainId: 10,
    domain: 10,
    kind: 'synthetic',
    token: identity('5'),
    router: routerIdentity('5'),
    mailbox: identity('6'),
    ism: identity('7'),
    routerIsmAddress: address('7'),
    activationTransactionHash: hash('c'),
}
const route: NewHaiAeroBridgeRoute = {
    id: 'test-new-bridge',
    issuerId: 'test-new-issuer',
    contractsCommit: 'a'.repeat(40),
    version: 'hyperlane-tokenrouter-unscaled-v3',
    base,
    optimism,
}
const account = address('8')
const amount = ethers.utils.parseEther('1')
const b32 = (value: string) => ethers.utils.hexZeroPad(value, 32)
const mailboxAbi = new ethers.utils.Interface(MAILBOX_ABI)
const routerAbi = new ethers.utils.Interface(NEW_ROUTER_ABI)
const erc20Abi = new ethers.utils.Interface(['event Transfer(address indexed from,address indexed to,uint256 value)'])
const reviewedQuote: NewBridgeQuote = {
    routeId: route.id,
    direction: 'base-to-optimism',
    account,
    sourceChainId: 8453,
    amount: amount.toString(),
    fee: '10',
    allowance: '0',
    destinationScanFrom: 95,
    expiresAt: Date.now() + 1_000_000,
}
const message = (recipient = account, sentAmount = amount, destination = 10) =>
    ethers.utils.solidityPack(
        ['uint8', 'uint32', 'uint32', 'bytes32', 'uint32', 'bytes32', 'bytes32', 'uint256'],
        [3, 9, 8453, b32(base.router.address), destination, b32(optimism.router.address), b32(recipient), sentAmount]
    )
const log = (emitter: string, abi: ethers.utils.Interface, name: string, values: any[]) => ({
    address: emitter,
    ...abi.encodeEventLog(abi.getEvent(name), values),
})
const sourceReceipt = (body = message()): any => ({
    status: 1,
    from: account,
    to: base.router.address,
    confirmations: 3,
    transactionHash: hash('a'),
    logs: [
        log(base.mailbox.address, mailboxAbi, 'Dispatch', [
            base.router.address,
            10,
            b32(optimism.router.address),
            body,
        ]),
        log(base.mailbox.address, mailboxAbi, 'DispatchId', [ethers.utils.keccak256(body)]),
    ],
})
const destinationReceipt = (): any => ({
    status: 1,
    from: address('9'),
    to: optimism.mailbox.address,
    confirmations: 3,
    transactionHash: hash('d'),
    logs: [
        log(optimism.mailbox.address, mailboxAbi, 'ProcessId', [ethers.utils.keccak256(message())]),
        log(optimism.mailbox.address, mailboxAbi, 'Process', [8453, b32(base.router.address), optimism.router.address]),
        log(optimism.router.address, routerAbi, 'ReceivedTransferRemote', [8453, b32(account), amount]),
        log(optimism.token.address, erc20Abi, 'Transfer', [ethers.constants.AddressZero, account, amount]),
    ],
})
let providers: any
let sourceRouter: any
let destinationRouter: any
let signer: any

beforeEach(() => {
    vi.clearAllMocks()
    getReviewedBridgeRoute.mockReturnValue(route)
    getReviewedIssuer.mockReturnValue({ wrapper: { address: base.token.address } })
    const makeProvider = (chainId: number) => ({
        getNetwork: vi.fn(async () => ({ chainId })),
        getBlockNumber: vi.fn(async () => 105),
        getCode: vi.fn(async () => code),
        getStorageAt: vi.fn(async () => hash('0')),
        getBalance: vi.fn(async () => ethers.utils.parseEther('1')),
        getTransactionReceipt: vi.fn(async (tx: string) =>
            tx === hash('a')
                ? sourceReceipt()
                : tx === hash('d')
                ? destinationReceipt()
                : { status: 1, confirmations: 3 }
        ),
        getLogs: vi.fn(async () => [{ transactionHash: hash('d') }]),
    })
    providers = { source: makeProvider(8453), destination: makeProvider(10) }
    const makeRouter = (endpoint: NewHaiAeroBridgeEndpoint, remote: NewHaiAeroBridgeEndpoint) => ({
        mailbox: vi.fn(async () => endpoint.mailbox.address),
        interchainSecurityModule: vi.fn(async () => endpoint.routerIsmAddress),
        routers: vi.fn(async () => b32(remote.router.address)),
        token: vi.fn(async () => endpoint.token.address),
        scaleNumerator: vi.fn(async () => BigNumber.from(1)),
        scaleDenominator: vi.fn(async () => BigNumber.from(1)),
        quoteTransferRemote: vi.fn(async () => [
            { token: ethers.constants.AddressZero, amount: BigNumber.from(10) },
            { token: endpoint.token.address, amount },
        ]),
        callStatic: { transferRemote: vi.fn(async () => hash('e')) },
        transferRemote: vi.fn(async () => ({ hash: hash('a') })),
        decimals: vi.fn(async () => 18),
        balanceOf: vi.fn(async () => amount.mul(10)),
        allowance: vi.fn(async () => BigNumber.from(0)),
        approve: vi.fn(async () => ({ hash: hash('f') })),
    })
    sourceRouter = makeRouter(base, optimism)
    destinationRouter = makeRouter(optimism, base)
    contracts[base.router.address] = sourceRouter
    contracts[base.token.address] = sourceRouter
    contracts[optimism.router.address] = destinationRouter
    for (const endpoint of [base, optimism])
        contracts[endpoint.mailbox.address] = {
            localDomain: vi.fn(async () => endpoint.domain),
            defaultIsm: vi.fn(async () => endpoint.ism.address),
            delivered: vi.fn(async () => true),
        }
    signer = { provider: providers.source, getAddress: vi.fn(async () => account), getChainId: vi.fn(async () => 8453) }
})

describe('new bridge adoption and quote gates', () => {
    it('checks both chains/security identities and quotes native fees without guessing a message ID', async () => {
        const quote = await getNewBridgeQuote(route.id, 'base-to-optimism', '1', account, providers)
        expect(quote.fee).toBe('10')
        expect(quote.amount).toBe(amount.toString())
        expect(sourceRouter.callStatic.transferRemote).not.toHaveBeenCalled()
    })
    it.each(['chain', 'router', 'ism', 'scale', 'runtime', 'implementation'])(
        'rejects changed %s configuration',
        async (condition) => {
            if (condition === 'chain') providers.destination.getNetwork.mockResolvedValue({ chainId: 8453 })
            if (condition === 'router') sourceRouter.routers.mockResolvedValue(b32(account))
            if (condition === 'ism') destinationRouter.interchainSecurityModule.mockResolvedValue(account)
            if (condition === 'scale') sourceRouter.scaleNumerator.mockResolvedValue(BigNumber.from(2))
            if (condition === 'runtime') providers.destination.getCode.mockResolvedValue('0x6001')
            if (condition === 'implementation') providers.source.getStorageAt.mockResolvedValueOnce(b32(account))
            await expect(verifyNewBridgeRoute(route, 'base-to-optimism', providers)).rejects.toThrow()
        }
    )
    it('rejects additional token fees and requests only the exact allowance', async () => {
        sourceRouter.quoteTransferRemote.mockResolvedValueOnce([{ token: base.token.address, amount: amount.add(1) }])
        await expect(getNewBridgeQuote(route.id, 'base-to-optimism', '1', account, providers)).rejects.toThrow(
            'token fees'
        )
        await submitNewBridgeStep(reviewedQuote, signer, providers)
        expect(sourceRouter.approve).toHaveBeenCalledWith(base.router.address, amount.toString())
    })
    it('simulates but obtains its authoritative message from the mined Dispatch bytes', async () => {
        sourceRouter.allowance.mockResolvedValue(amount)
        await submitNewBridgeStep({ ...reviewedQuote, allowance: amount.toString() }, signer, providers)
        const dispatch = extractVerifiedDispatch(reviewedQuote, sourceReceipt())
        expect(sourceRouter.callStatic.transferRemote).toHaveBeenCalled()
        expect(dispatch.messageId).toBe(ethers.utils.keccak256(message()))
        expect(dispatch.messageId).not.toBe(hash('e'))
    })
})

describe('source and destination proof', () => {
    it.each(['recipient', 'amount', 'domain'])('rejects a different dispatched %s', (condition) => {
        const body =
            condition === 'recipient'
                ? message(address('9'))
                : condition === 'amount'
                ? message(account, amount.add(1))
                : message(account, amount, 8453)
        expect(() => extractVerifiedDispatch(reviewedQuote, sourceReceipt(body))).toThrow('does not match')
    })
    it('requires DispatchId from the verified mailbox as well as the complete message', () => {
        const receipt = sourceReceipt()
        receipt.logs[1].address = account
        expect(() => extractVerifiedDispatch(reviewedQuote, receipt)).toThrow('No unique matching')
    })
    it('does not treat source success as destination success', async () => {
        contracts[optimism.mailbox.address].delivered.mockResolvedValue(false)
        const dispatch = extractVerifiedDispatch(reviewedQuote, sourceReceipt())
        expect((await checkNewBridgeDelivery(reviewedQuote, dispatch, providers)).delivered).toBe(false)
        expect(providers.destination.getLogs).not.toHaveBeenCalled()
    })
    it('requires the same message, route, recipient and minted amount in the destination receipt', () => {
        const dispatch = extractVerifiedDispatch(reviewedQuote, sourceReceipt())
        expect(() => verifyDestinationReceipt(reviewedQuote, dispatch, destinationReceipt())).not.toThrow()
        for (let index = 0; index < 4; index++) {
            const receipt = destinationReceipt()
            receipt.logs.splice(index, 1)
            expect(() => verifyDestinationReceipt(reviewedQuote, dispatch, receipt)).toThrow('does not prove')
        }
    })
    it('checks delivered plus a confirmed receipt, using bounded resumable scans', async () => {
        const dispatch = extractVerifiedDispatch(reviewedQuote, sourceReceipt())
        const result = await checkNewBridgeDelivery(reviewedQuote, dispatch, providers)
        expect(result.delivered).toBe(true)
        expect(result.destinationTransactionHash).toBe(hash('d'))
        expect(providers.destination.getLogs).toHaveBeenCalledWith(
            expect.objectContaining({
                address: optimism.mailbox.address,
                topics: [ethers.utils.id('ProcessId(bytes32)'), dispatch.messageId],
                fromBlock: 95,
                toBlock: 105,
            })
        )
    })
    it('does not trust persisted message IDs or timeout state', async () => {
        const dispatch = extractVerifiedDispatch(reviewedQuote, sourceReceipt())
        await expect(
            checkNewBridgeDelivery(reviewedQuote, { ...dispatch, messageId: hash('e') }, providers)
        ).rejects.toThrow('Saved bridge message')
        providers.destination.getLogs.mockResolvedValue([])
        expect(await checkNewBridgeDelivery(reviewedQuote, dispatch, providers)).toEqual({
            delivered: false,
            scanFrom: 106,
        })
    })
})

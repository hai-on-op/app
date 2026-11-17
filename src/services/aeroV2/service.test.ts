import { BigNumber, ethers } from 'ethers'
import type { Signer } from 'ethers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAeroV2Config, LEGACY_SOURCES } from './config'
import {
    approveAeroV2,
    checkAeroV2Delivery,
    executeAeroV2,
    getAeroV2Balances,
    getAeroV2Nfts,
    quoteAeroV2,
} from './service'
import type { AeroV2Action, AeroV2ChainId } from './types'

const mocks = vi.hoisted(() => ({ contracts: new Map<string, any>(), providers: new Map<number, any>() }))
vi.mock('./providers', () => ({ getAeroV2Provider: (chainId: number) => mocks.providers.get(chainId) }))
vi.mock('ethers', async () => {
    const actual = await vi.importActual<typeof import('ethers')>('ethers')
    return {
        ...actual,
        ethers: {
            ...actual.ethers,
            Contract: vi.fn((address: string) => {
                const contract = mocks.contracts.get(address.toLowerCase())
                if (!contract) throw new Error(`Unexpected test contract ${address}`)
                return contract
            }),
        },
    }
})

const ACCOUNT = '0x1111111111111111111111111111111111111111'
const OTHER = '0x2222222222222222222222222222222222222222'
const MANAGER = '0x3333333333333333333333333333333333333333'
const OP_WRAPPER = '0x4444444444444444444444444444444444444444'
const BASE_WRAPPER = '0x5555555555555555555555555555555555555555'
const OP_MAILBOX = '0x6666666666666666666666666666666666666666'
const BASE_MAILBOX = '0x7777777777777777777777777777777777777777'
const HASH = '0x' + '88'.repeat(32)
const ZERO = ethers.constants.AddressZero
const unit = (amount: string) => ethers.utils.parseEther(amount)
const contractAt = (address: string) => mocks.contracts.get(address.toLowerCase())
const wrapper = (chainId: AeroV2ChainId = 10) => contractAt(chainId === 10 ? OP_WRAPPER : BASE_WRAPPER)
const signer = (chainId = 10, account = ACCOUNT) =>
    ({
        getChainId: vi.fn().mockResolvedValue(chainId),
        getAddress: vi.fn().mockResolvedValue(account),
    }) as unknown as Signer

function token(address: string) {
    const result = {
        address,
        balanceOf: vi.fn().mockResolvedValue(unit('1000')),
        allowance: vi.fn().mockResolvedValue(ethers.constants.MaxUint256),
        approve: vi.fn(),
        estimateGas: { approve: vi.fn().mockResolvedValue(BigNumber.from(50000)) },
        connect: vi.fn(),
    }
    result.connect.mockReturnValue(result)
    result.approve.mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ status: 1, from: ACCOUNT, to: address, transactionHash: HASH, logs: [] }),
    })
    mocks.contracts.set(address.toLowerCase(), result)
    return result
}

beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_HAI_AERO_V2_OP_ADDRESS', OP_WRAPPER)
    vi.stubEnv('VITE_HAI_AERO_V2_BASE_ADDRESS', BASE_WRAPPER)
    mocks.contracts.clear()
    mocks.providers.clear()
    for (const chainId of [10, 8453] as const) {
        const config = getAeroV2Config(chainId)
        const wrapperAddress = config.wrapperAddress!
        const mailbox = chainId === 10 ? OP_MAILBOX : BASE_MAILBOX
        mocks.providers.set(chainId, {
            getNetwork: vi.fn().mockResolvedValue({ chainId }),
            getCode: vi.fn().mockResolvedValue('0x1234'),
            getBalance: vi.fn().mockResolvedValue(unit('10')),
        })
        token(config.underlyingAddress)
        const wrapped = token(wrapperAddress)
        Object.assign(wrapped, {
            deploymentChainId: vi.fn().mockResolvedValue(chainId),
            BASE_TOKEN: vi.fn().mockResolvedValue(config.underlyingAddress),
            BASE_TOKEN_NFT: vi.fn().mockResolvedValue(config.nftAddress || ZERO),
            token: vi.fn().mockResolvedValue(wrapperAddress),
            decimals: vi.fn().mockResolvedValue(18),
            localDomain: vi.fn().mockResolvedValue(chainId),
            scaleNumerator: vi.fn().mockResolvedValue(1),
            scaleDenominator: vi.fn().mockResolvedValue(1),
            baseTokenManager: vi.fn().mockResolvedValue(MANAGER),
            paused: vi.fn().mockResolvedValue(false),
            LEGACY_VELO_V1: vi.fn().mockResolvedValue(LEGACY_SOURCES.haiVeloV1.address),
            LEGACY_VELO_V2: vi.fn().mockResolvedValue(LEGACY_SOURCES.haiVeloV2.address),
            LEGACY_AERO_OPTIMISM: vi.fn().mockResolvedValue(LEGACY_SOURCES.haiAeroV1.address),
            previewMigration: vi.fn(async (source: string, amount: BigNumber) =>
                source === LEGACY_SOURCES.haiAeroV1.address ? amount : amount.mul(44).div(1000)
            ),
            routers: vi.fn().mockResolvedValue(ethers.utils.hexZeroPad(chainId === 10 ? BASE_WRAPPER : OP_WRAPPER, 32)),
            feeHook: vi.fn().mockResolvedValue(ZERO),
            feeToken: vi.fn().mockResolvedValue(ZERO),
            mailbox: vi.fn().mockResolvedValue(mailbox),
            quoteTransferRemote: vi.fn(async (_domain, _recipient, amount) => [
                { token: ZERO, amount: unit('0.001') },
                { token: wrapperAddress, amount: BigNumber.from(amount).add(unit('0.1')) },
                { token: wrapperAddress, amount: BigNumber.from(0) },
            ]),
        })
        for (const method of ['deposit', 'depositNFTs', 'migrate', 'transferRemote']) {
            ;(wrapped as any).estimateGas[method] = vi.fn().mockResolvedValue(BigNumber.from(100000))
            ;(wrapped as any)[method] = vi.fn().mockResolvedValue({
                wait: vi.fn().mockResolvedValue({
                    status: 1,
                    from: ACCOUNT,
                    to: wrapperAddress,
                    transactionHash: HASH,
                    logs: [],
                }),
            })
        }
        mocks.contracts.set(mailbox.toLowerCase(), {
            localDomain: vi.fn().mockResolvedValue(chainId),
            delivered: vi.fn().mockResolvedValue(false),
        })
    }
    for (const source of Object.values(LEGACY_SOURCES)) token(source.address)
    const nftAddress = getAeroV2Config(8453).nftAddress!
    Object.assign(token(nftAddress), {
        TOKEN: vi.fn().mockResolvedValue(getAeroV2Config(8453).underlyingAddress),
        balanceOf: vi.fn().mockResolvedValue(BigNumber.from(2)),
        tokenOfOwnerByIndex: vi.fn(async (_account, index) => BigNumber.from(index + 1)),
        ownerOf: vi.fn().mockResolvedValue(ACCOUNT),
        staked: vi.fn().mockResolvedValue({ amount: unit('7'), end: BigNumber.from(2000000000), isPermanent: false }),
        getApproved: vi.fn().mockResolvedValue(ZERO),
        isApprovedForAll: vi.fn().mockResolvedValue(false),
    })
})

const deposit: AeroV2Action = { kind: 'deposit', chainId: 10, amount: '1.25' }
const bridge: AeroV2Action = { kind: 'bridge', chainId: 10, amount: '2' }

describe('haiAERO v2 configuration and exact quotes', () => {
    it('does not invent a wrapper address when configuration is absent', async () => {
        vi.stubEnv('VITE_HAI_AERO_V2_OP_ADDRESS', '')
        expect(getAeroV2Config(10).wrapperAddress).toBeUndefined()
        await expect(quoteAeroV2(deposit, ACCOUNT)).rejects.toThrow('not configured')
        expect((await getAeroV2Balances(10, ACCOUNT)).wrappedWei).toBe('0')
    })

    it.each([ZERO, LEGACY_SOURCES.haiAeroV1.address, 'not-an-address'])(
        'rejects unsafe wrapper configuration %s',
        (address) => {
            vi.stubEnv('VITE_HAI_AERO_V2_OP_ADDRESS', address)
            expect(() => getAeroV2Config(10)).toThrow('Invalid haiAERO v2 address')
        }
    )

    it.each(['0', '.0', '.', '-1', '1e3', '0.0000000000000000001', '.0000000000000000001', '1,000', '1.0 AERO'])(
        'rejects ambiguous or unsupported amount %s',
        async (amount) => {
            await expect(quoteAeroV2({ ...deposit, amount }, ACCOUNT)).rejects.toThrow()
        }
    )

    it.each<AeroV2Action>([
        { kind: 'deposit', chainId: 8453, amount: '.001' },
        { kind: 'deposit', chainId: 10, amount: '.001' },
        { kind: 'migrate', chainId: 10, amount: '.001', source: 'haiVeloV2' },
        { kind: 'bridge', chainId: 8453, amount: '.001' },
    ])('quotes a leading decimal identically for $kind on chain $chainId', async (action) => {
        const canonical = await quoteAeroV2({ ...action, amount: '0.001' }, ACCOUNT)
        const shorthand = await quoteAeroV2(action, ACCOUNT)
        expect(shorthand.inputWei).toBe('1000000000000000')
        expect(shorthand.outputWei).toBe(canonical.outputWei)
        expect(shorthand.approvals).toEqual(canonical.approvals)
        expect(shorthand.nativeFeeWei).toBe(canonical.nativeFeeWei)
    })

    it('preserves all 18 decimal places when the leading zero is omitted', async () => {
        const quote = await quoteAeroV2({ ...deposit, amount: '.000000000000000001' }, ACCOUNT)
        expect(quote.inputWei).toBe('1')
        expect(quote.outputWei).toBe('1')
    })

    it.each(['haiVeloV1', 'haiVeloV2', 'haiAeroV1'] as const)(
        'uses the onchain migration rate for %s',
        async (source) => {
            const quote = await quoteAeroV2(
                { kind: 'migrate', chainId: 10, amount: '1.000000000000000001', source },
                ACCOUNT
            )
            const expected = source === 'haiAeroV1' ? '1000000000000000001' : '44000000000000000'
            expect(quote.outputWei).toBe(expected)
            expect(wrapper().previewMigration).toHaveBeenCalledWith(
                LEGACY_SOURCES[source].address,
                BigNumber.from(quote.inputWei)
            )
        }
    )

    it('rejects migration dust and inconsistent onchain conversion', async () => {
        const action: AeroV2Action = {
            kind: 'migrate',
            chainId: 10,
            amount: '0.000000000000000001',
            source: 'haiVeloV2',
        }
        await expect(quoteAeroV2(action, ACCOUNT)).rejects.toThrow('too small')
        wrapper().previewMigration.mockResolvedValue(unit('10'))
        await expect(quoteAeroV2({ ...action, amount: '1' }, ACCOUNT)).rejects.toThrow('migration rate')
    })

    it('verifies wrapper identity and pinned provider network', async () => {
        wrapper().BASE_TOKEN.mockResolvedValue(OTHER)
        await expect(quoteAeroV2(deposit, ACCOUNT)).rejects.toThrow('does not match')
        mocks.providers.get(10).getNetwork.mockResolvedValue({ chainId: 8453 })
        await expect(quoteAeroV2(deposit, ACCOUNT)).rejects.toThrow('wrong chain')
    })

    it('blocks local issuance while allowing bridge quotes and balances when paused', async () => {
        wrapper().paused.mockResolvedValue(true)
        await expect(quoteAeroV2(deposit, ACCOUNT)).rejects.toThrow('paused')
        expect((await quoteAeroV2(bridge, ACCOUNT)).outputWei).toBe(unit('2').toString())
        expect((await getAeroV2Balances(10, ACCOUNT)).wrappedWei).toBe(unit('1000').toString())
    })
})

describe('sAERO principal and approvals', () => {
    const nftAction: AeroV2Action = { kind: 'nft', chainId: 8453, amount: '', tokenIds: ['1', '2'] }

    it('mints current staked principal for timed or permanent NFTs and lists both', async () => {
        const nft = contractAt(getAeroV2Config(8453).nftAddress!)
        nft.staked.mockImplementation(async (id: BigNumber | string) => ({
            amount: unit(id.toString() === '1' ? '7' : '3'),
            end: 0,
            isPermanent: id.toString() === '2',
        }))
        const quote = await quoteAeroV2(nftAction, ACCOUNT)
        expect(quote.outputWei).toBe(unit('10').toString())
        expect(quote.approvals.map((item) => item.tokenId)).toEqual(['1', '2'])
        const owned = await getAeroV2Nfts(ACCOUNT)
        expect(owned.map((item) => item.isPermanent)).toEqual([false, true])
    })

    it.each([['1', '1'], ['01'], ['-1'], []])('rejects invalid NFT IDs %s', async (...ids) => {
        await expect(quoteAeroV2({ ...nftAction, tokenIds: ids as string[] }, ACCOUNT)).rejects.toThrow('NFT IDs')
    })

    it('requires ownership and positive staked principal', async () => {
        const nft = contractAt(getAeroV2Config(8453).nftAddress!)
        nft.ownerOf.mockResolvedValue(OTHER)
        await expect(quoteAeroV2(nftAction, ACCOUNT)).rejects.toThrow('do not own')
        nft.ownerOf.mockResolvedValue(ACCOUNT)
        nft.staked.mockResolvedValue({ amount: BigNumber.from(0), end: 0, isPermanent: true })
        await expect(quoteAeroV2(nftAction, ACCOUNT)).rejects.toThrow('no staked AERO')
    })

    it('approves exactly one NFT without requesting approval for all', async () => {
        const quote = await quoteAeroV2(nftAction, ACCOUNT)
        await approveAeroV2(quote, signer(8453))
        const nft = contractAt(getAeroV2Config(8453).nftAddress!)
        expect(nft.approve).toHaveBeenCalledTimes(1)
        expect(nft.approve.mock.calls[0].slice(0, 2)).toEqual([BASE_WRAPPER, '1'])
    })
})

describe('writes recheck the reviewed action and signer', () => {
    it('approves and mints the exact Base amount entered without a leading zero', async () => {
        const underlying = contractAt(getAeroV2Config(8453).underlyingAddress)
        underlying.allowance.mockResolvedValue(0)
        const quote = await quoteAeroV2({ kind: 'deposit', chainId: 8453, amount: '.001' }, ACCOUNT)

        await approveAeroV2(quote, signer(8453))
        expect(underlying.approve.mock.calls[0].slice(0, 2)).toEqual([BASE_WRAPPER, '1000000000000000'])

        underlying.allowance.mockResolvedValue(unit('0.001'))
        await executeAeroV2(quote, signer(8453))
        expect(wrapper(8453).deposit.mock.calls[0].slice(0, 2)).toEqual([ACCOUNT, '1000000000000000'])
    })

    it.each([
        ['network', signer(8453)],
        ['wallet', signer(10, OTHER)],
    ] as const)('rejects the wrong %s for both approval and execution', async (_label, wrongSigner) => {
        const underlying = contractAt(getAeroV2Config(10).underlyingAddress)
        underlying.allowance.mockResolvedValue(0)
        const quote = await quoteAeroV2(deposit, ACCOUNT)
        await expect(approveAeroV2(quote, wrongSigner)).rejects.toThrow()
        await expect(executeAeroV2(quote, wrongSigner)).rejects.toThrow()
        expect(underlying.approve).not.toHaveBeenCalled()
        expect(wrapper().deposit).not.toHaveBeenCalled()
    })

    it('rechecks chain immediately after gas estimation and before sending', async () => {
        const quote = await quoteAeroV2(deposit, ACCOUNT)
        const wallet = signer()
        vi.mocked(wallet.getChainId).mockResolvedValueOnce(10).mockResolvedValueOnce(8453)
        await expect(executeAeroV2(quote, wallet)).rejects.toThrow('network')
        expect(wrapper().deposit).not.toHaveBeenCalled()
    })

    it('rejects cached signer identity when the wallet selected account changed', async () => {
        const quote = await quoteAeroV2(deposit, ACCOUNT)
        const wallet = signer()
        const request = vi.fn(async ({ method }: { method: string }) => (method === 'eth_accounts' ? [OTHER] : '0xa'))
        Object.assign(wallet, { provider: new ethers.providers.Web3Provider({ request }) })
        await expect(executeAeroV2(quote, wallet)).rejects.toThrow('active wallet account changed')
        expect(wrapper().deposit).not.toHaveBeenCalled()
    })

    it('rechecks the wallet again before sending an approval', async () => {
        const underlying = contractAt(getAeroV2Config(10).underlyingAddress)
        underlying.allowance.mockResolvedValue(0)
        const quote = await quoteAeroV2(deposit, ACCOUNT)
        const wallet = signer()
        vi.mocked(wallet.getAddress).mockResolvedValueOnce(ACCOUNT).mockResolvedValueOnce(OTHER)
        await expect(approveAeroV2(quote, wallet)).rejects.toThrow('wallet changed')
        expect(underlying.approve).not.toHaveBeenCalled()
    })

    it('blocks approvals after local issuance is paused', async () => {
        contractAt(getAeroV2Config(10).underlyingAddress).allowance.mockResolvedValue(0)
        const quote = await quoteAeroV2(deposit, ACCOUNT)
        wrapper().paused.mockResolvedValue(true)
        await expect(approveAeroV2(quote, signer())).rejects.toThrow('paused')
    })

    it('detects changes to treasury, pause state, balance and allowances', async () => {
        const quote = await quoteAeroV2(deposit, ACCOUNT)
        wrapper().baseTokenManager.mockResolvedValue(OTHER)
        await expect(executeAeroV2(quote, signer())).rejects.toThrow('changed')
        wrapper().baseTokenManager.mockResolvedValue(MANAGER)
        wrapper().paused.mockResolvedValue(true)
        await expect(executeAeroV2(quote, signer())).rejects.toThrow('paused')
        wrapper().paused.mockResolvedValue(false)
        const underlying = contractAt(getAeroV2Config(10).underlyingAddress)
        underlying.balanceOf.mockResolvedValue(0)
        await expect(executeAeroV2(quote, signer())).rejects.toThrow('Insufficient')
        underlying.balanceOf.mockResolvedValue(unit('10'))
        underlying.allowance.mockResolvedValue(0)
        await expect(executeAeroV2(quote, signer())).rejects.toThrow('Approve')
    })

    it('sends migration to V3 with an exact onchain minOut', async () => {
        const quote = await quoteAeroV2({ kind: 'migrate', chainId: 10, source: 'haiVeloV2', amount: '10' }, ACCOUNT)
        const result = await executeAeroV2(quote, signer())
        expect(wrapper().migrate.mock.calls[0].slice(0, 4)).toEqual([
            LEGACY_SOURCES.haiVeloV2.address,
            unit('10').toString(),
            unit('0.44').toString(),
            ACCOUNT,
        ])
        expect(result.hash).toBe(HASH)
    })
})

describe('Hyperlane burn and mint bridge', () => {
    it.each([10, 8453] as const)('quotes full fees without token approvals on chain %s', async (chainId) => {
        const quote = await quoteAeroV2({ ...bridge, chainId }, ACCOUNT)
        expect(quote.nativeFeeWei).toBe(unit('0.001').toString())
        expect(quote.tokenFeeWei).toBe(unit('0.1').toString())
        expect(quote.approvals).toEqual([])
        expect(wrapper(chainId).quoteTransferRemote).toHaveBeenCalledWith(
            chainId === 10 ? 8453 : 10,
            ethers.utils.hexZeroPad(ACCOUNT, 32),
            unit('2')
        )
    })

    it('rejects asymmetric peers and unsupported fee hooks', async () => {
        wrapper(8453).routers.mockResolvedValue(ethers.constants.HashZero)
        await expect(quoteAeroV2(bridge, ACCOUNT)).rejects.toThrow('both directions')
        wrapper(8453).routers.mockResolvedValue(ethers.utils.hexZeroPad(OP_WRAPPER, 32))
        wrapper().feeHook.mockResolvedValue(OTHER)
        await expect(quoteAeroV2(bridge, ACCOUNT)).rejects.toThrow('not supported')
    })

    it('retains a confirmed hash if bridge receipt decoding is unavailable', async () => {
        const quote = await quoteAeroV2(bridge, ACCOUNT)
        const result = await executeAeroV2(quote, signer())
        expect(result.hash).toBe(HASH)
        expect(result.messageId).toBeUndefined()
        expect(result.trackingError).toContain('do not send it again')
    })

    it('tracks destination mailbox delivery instead of destination balance changes', async () => {
        const result = {
            hash: HASH,
            chainId: 10 as const,
            kind: 'bridge' as const,
            messageId: '0x' + '99'.repeat(32),
            sourceWrapperAddress: OP_WRAPPER,
            destinationWrapperAddress: BASE_WRAPPER,
            destinationChainId: 8453 as const,
            destinationMailbox: BASE_MAILBOX,
        }
        expect(await checkAeroV2Delivery(result)).toBe(false)
        expect(wrapper(8453).balanceOf).not.toHaveBeenCalled()
        contractAt(BASE_MAILBOX).delivered.mockResolvedValue(true)
        expect(await checkAeroV2Delivery(result)).toBe(true)
        expect(contractAt(BASE_MAILBOX).delivered).toHaveBeenCalledWith(result.messageId)
    })
})

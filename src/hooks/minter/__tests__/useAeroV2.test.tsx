import { act, cleanup, renderHook } from '@testing-library/react-hooks'
import { ethers } from 'ethers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAeroV2 } from '../useAeroV2'
import type {
    AeroV2Action,
    AeroV2ChainId,
    AeroV2Config,
    AeroV2Quote,
    AeroV2TransactionResult,
} from '~/services/aeroV2/types'

const { wallet, service, signer } = vi.hoisted(() => ({
    wallet: {
        account: undefined as string | undefined,
        chainId: undefined as number | undefined,
        hasSigner: true,
    },
    service: {
        getAeroV2Config: vi.fn(),
        getAeroV2Balances: vi.fn(),
        getAeroV2Nfts: vi.fn(),
        quoteAeroV2: vi.fn(),
        approveAeroV2: vi.fn(),
        executeAeroV2: vi.fn(),
        checkAeroV2Delivery: vi.fn(),
    },
    signer: { getAddress: vi.fn(), getChainId: vi.fn() },
}))

vi.mock('wagmi', () => ({
    useAccount: () => ({ address: wallet.account }),
    useNetwork: () => ({ chain: wallet.chainId ? { id: wallet.chainId } : undefined }),
}))

vi.mock('~/hooks/useEthersAdapters', () => ({
    useEthersSigner: () => (wallet.hasSigner ? signer : undefined),
}))

vi.mock('~/services/aeroV2', () => service)

const ACCOUNT = '0x1111111111111111111111111111111111111111'
const OTHER_ACCOUNT = '0x2222222222222222222222222222222222222222'
const OP_WRAPPER = '0x3333333333333333333333333333333333333333'
const BASE_WRAPPER = '0x4444444444444444444444444444444444444444'
const HASH = `0x${'a'.repeat(64)}`
const MESSAGE = `0x${'b'.repeat(64)}`
const deposit: AeroV2Action = { kind: 'deposit', chainId: 10, amount: '1' }

function config(chainId: AeroV2ChainId): AeroV2Config {
    return {
        chainId,
        chainName: chainId === 10 ? 'Optimism' : 'Base',
        underlyingSymbol: chainId === 10 ? 'xAERO' : 'AERO',
        underlyingAddress: '0x5555555555555555555555555555555555555555',
        wrapperAddress: chainId === 10 ? OP_WRAPPER : BASE_WRAPPER,
        nftAddress: chainId === 8453 ? '0x6666666666666666666666666666666666666666' : undefined,
    }
}

function quote(action: AeroV2Action, account = ACCOUNT): AeroV2Quote {
    return {
        action,
        account,
        wrapperAddress: config(action.chainId).wrapperAddress!,
        inputWei: ethers.utils.parseEther(action.amount || '1').toString(),
        outputWei: ethers.utils.parseEther(action.amount || '1').toString(),
        nativeFeeWei: '0',
        tokenFeeWei: '0',
        approvals: [],
        ...(action.kind === 'bridge'
            ? {
                  destinationChainId: action.chainId === 10 ? 8453 : 10,
                  destinationWrapperAddress: action.chainId === 10 ? BASE_WRAPPER : OP_WRAPPER,
                  destinationMailbox: '0x7777777777777777777777777777777777777777',
              }
            : {}),
    }
}

function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((fulfill) => {
        resolve = fulfill
    })
    return { promise, resolve }
}

async function requestQuote() {
    await act(async () => {
        vi.advanceTimersByTime(300)
        await Promise.resolve()
    })
}

describe('useAeroV2', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.resetAllMocks()
        localStorage.clear()
        wallet.account = ACCOUNT
        wallet.chainId = 10
        wallet.hasSigner = true
        signer.getAddress.mockImplementation(async () => wallet.account)
        signer.getChainId.mockImplementation(async () => wallet.chainId)
        service.getAeroV2Config.mockImplementation(config)
        service.getAeroV2Balances.mockResolvedValue({
            underlyingWei: ethers.utils.parseEther('1000').toString(),
            wrappedWei: ethers.utils.parseEther('1000').toString(),
            legacy: { haiVeloV1: '0', haiVeloV2: '0', haiAeroV1: '0' },
        })
        service.getAeroV2Nfts.mockResolvedValue([])
        service.quoteAeroV2.mockImplementation(async (action: AeroV2Action, account: string) => quote(action, account))
        service.approveAeroV2.mockResolvedValue({ hash: HASH, chainId: 10, kind: 'approval' })
        service.executeAeroV2.mockResolvedValue({ hash: HASH, chainId: 10, kind: 'deposit' })
        service.checkAeroV2Delivery.mockResolvedValue(false)
    })

    afterEach(async () => {
        await cleanup()
        vi.useRealTimers()
    })

    it.each<AeroV2Action>([
        deposit,
        { kind: 'nft', chainId: 8453, amount: '', tokenIds: ['1'] },
        { kind: 'migrate', chainId: 10, amount: '1', source: 'haiVeloV2' },
        { kind: 'bridge', chainId: 10, amount: '1' },
    ])('does not quote, approve, or send an undeployed $kind action', async (action) => {
        service.getAeroV2Config.mockImplementation((chainId: AeroV2ChainId) => ({
            ...config(chainId),
            wrapperAddress: undefined,
        }))
        const { result } = renderHook(() => useAeroV2(action))
        await requestQuote()

        await act(async () => {
            await result.current.approve()
            await result.current.execute()
        })

        expect(result.current.available).toBe(false)
        expect(result.current.quote).toBeUndefined()
        expect(service.getAeroV2Balances).not.toHaveBeenCalled()
        expect(service.quoteAeroV2).not.toHaveBeenCalled()
        expect(service.approveAeroV2).not.toHaveBeenCalled()
        expect(service.executeAeroV2).not.toHaveBeenCalled()
    })

    it('requires the destination deployment before enabling a bridge', async () => {
        service.getAeroV2Config.mockImplementation((chainId: AeroV2ChainId) => ({
            ...config(chainId),
            wrapperAddress: chainId === 10 ? OP_WRAPPER : undefined,
        }))
        const { result } = renderHook(() => useAeroV2({ ...deposit, kind: 'bridge' }))
        await requestQuote()
        await act(async () => {
            await result.current.execute()
        })

        expect(result.current.available).toBe(false)
        expect(service.quoteAeroV2).not.toHaveBeenCalled()
        expect(service.executeAeroV2).not.toHaveBeenCalled()
    })

    it('does not quote or write while the wallet is disconnected', async () => {
        wallet.account = undefined
        wallet.hasSigner = false
        const { result } = renderHook(() => useAeroV2(deposit))
        await requestQuote()
        await act(async () => {
            await result.current.approve()
            await result.current.execute()
        })

        expect(service.quoteAeroV2).not.toHaveBeenCalled()
        expect(service.approveAeroV2).not.toHaveBeenCalled()
        expect(service.executeAeroV2).not.toHaveBeenCalled()
    })

    it('rejects writes on the wrong wallet network despite having a quote', async () => {
        wallet.chainId = 8453
        const { result } = renderHook(() => useAeroV2(deposit))
        await requestQuote()
        expect(result.current.quote).toBeDefined()

        await act(async () => {
            await result.current.approve()
            await result.current.execute()
        })

        expect(result.current.error).toMatch(/wallet or selection changed/i)
        expect(service.approveAeroV2).not.toHaveBeenCalled()
        expect(service.executeAeroV2).not.toHaveBeenCalled()
    })

    it.each(['account', 'chain'] as const)(
        'rejects a signer whose %s disagrees with the connected wallet',
        async (field) => {
            if (field === 'account') signer.getAddress.mockResolvedValue(OTHER_ACCOUNT)
            else signer.getChainId.mockResolvedValue(8453)
            const { result } = renderHook(() => useAeroV2(deposit))
            await requestQuote()
            await act(async () => {
                await result.current.execute()
            })

            expect(service.executeAeroV2).not.toHaveBeenCalled()
            expect(result.current.error).toMatch(/wallet or selection changed/i)
        }
    )

    it.each(['amount', 'account', 'chain'] as const)(
        'immediately removes the old quote and prevents its captured submit after a %s change',
        async (field) => {
            const { result, rerender } = renderHook(({ action }) => useAeroV2(action), {
                initialProps: { action: deposit },
            })
            await requestQuote()
            expect(result.current.quote).toBeDefined()
            const oldExecute = result.current.execute

            if (field === 'account') wallet.account = OTHER_ACCOUNT
            if (field === 'chain') wallet.chainId = 8453
            rerender({ action: field === 'amount' ? { ...deposit, amount: '2' } : deposit })
            expect(result.current.quote).toBeUndefined()

            await act(async () => {
                await oldExecute()
            })
            expect(service.executeAeroV2).not.toHaveBeenCalled()
        }
    )

    it('discards an older async quote that resolves after the current amount has been quoted', async () => {
        const oldRequest = deferred<AeroV2Quote>()
        service.quoteAeroV2.mockImplementationOnce(() => oldRequest.promise)
        const { result, rerender } = renderHook(({ action }) => useAeroV2(action), {
            initialProps: { action: deposit },
        })
        await requestQuote()
        const nextAction = { ...deposit, amount: '2' }
        rerender({ action: nextAction })
        await requestQuote()
        expect(result.current.quote?.action.amount).toBe('2')

        await act(async () => oldRequest.resolve(quote(deposit)))
        expect(result.current.quote?.action.amount).toBe('2')
        await act(async () => {
            await result.current.execute()
        })
        expect(service.executeAeroV2).toHaveBeenCalledWith(expect.objectContaining({ action: nextAction }), signer)
    })

    it('rechecks the request after async signer validation before calling the write service', async () => {
        const signerAddress = deferred<string>()
        signer.getAddress.mockReturnValue(signerAddress.promise)
        const { result, rerender } = renderHook(({ action }) => useAeroV2(action), {
            initialProps: { action: deposit },
        })
        await requestQuote()
        let submission!: ReturnType<ReturnType<typeof useAeroV2>['execute']>
        act(() => {
            submission = result.current.execute()
        })
        wallet.account = OTHER_ACCOUNT
        rerender({ action: deposit })

        await act(async () => {
            signerAddress.resolve(ACCOUNT)
            await submission
        })

        expect(service.executeAeroV2).not.toHaveBeenCalled()
        expect(result.current.quote).toBeUndefined()
    })

    it('never calls token approval for a burn-and-mint bridge', async () => {
        const { result } = renderHook(() => useAeroV2({ ...deposit, kind: 'bridge' }))
        await requestQuote()
        await act(async () => {
            await result.current.approve()
        })

        expect(service.approveAeroV2).not.toHaveBeenCalled()
        expect(result.current.error).toMatch(/does not require token approval/i)
    })

    it('keeps a source-confirmed bridge pending until destination delivery is verified', async () => {
        const submission = deferred<AeroV2TransactionResult>()
        service.executeAeroV2.mockReturnValue(submission.promise)
        const { result } = renderHook(() => useAeroV2({ ...deposit, kind: 'bridge' }))
        await requestQuote()
        let execution!: ReturnType<ReturnType<typeof useAeroV2>['execute']>
        act(() => {
            execution = result.current.execute()
        })
        await act(async () => Promise.resolve())
        expect(result.current.transactions).toEqual([])

        await act(async () => {
            submission.resolve({
                hash: HASH,
                chainId: 10,
                kind: 'bridge',
                messageId: MESSAGE,
                destinationChainId: 8453,
                destinationMailbox: '0x7777777777777777777777777777777777777777',
            })
            expect(await execution).toMatchObject({ hash: HASH, kind: 'bridge' })
        })

        expect(result.current.transactions).toHaveLength(1)
        expect(result.current.transactions[0]).toMatchObject({ hash: HASH, delivered: false })
        expect(service.checkAeroV2Delivery).toHaveBeenCalled()

        service.checkAeroV2Delivery.mockResolvedValue(true)
        await act(async () => {
            vi.advanceTimersByTime(10000)
            await Promise.resolve()
        })
        expect(result.current.transactions[0].delivered).toBe(true)
    })
})

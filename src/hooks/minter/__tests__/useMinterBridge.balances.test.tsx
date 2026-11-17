import type { ReactNode } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react-hooks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMinterBridge } from '../useMinterBridge'

const { wallet, service } = vi.hoisted(() => ({
    wallet: { address: '0x3333333333333333333333333333333333333333' as string | undefined },
    service: {
        getBridgeConfig: vi.fn(() => ({})),
        quoteBridgeFee: vi.fn(),
        checkBridgeApproval: vi.fn(),
        approveBridge: vi.fn(),
        executeBridge: vi.fn(),
        checkBridgeStatus: vi.fn(),
        getBaseBalance: vi.fn(),
        getOptimismBalance: vi.fn(),
        validateBridgePrerequisites: vi.fn(),
    },
}))

vi.mock('wagmi', () => ({
    useAccount: () => ({ address: wallet.address }),
    useNetwork: () => ({ chain: { id: 10 } }),
    useSwitchNetwork: () => ({}),
    useWalletClient: () => ({}),
}))
vi.mock('~/services/hyperlane', () => service)

const ZERO = { raw: '0', formatted: '0.0', decimals: 18 }
let client: QueryClient

beforeEach(() => {
    vi.clearAllMocks()
    wallet.address = '0x3333333333333333333333333333333333333333'
    service.getBaseBalance.mockResolvedValue(ZERO)
    service.getOptimismBalance.mockResolvedValue(ZERO)
    client = new QueryClient({
        defaultOptions: { queries: { retryDelay: 0, cacheTime: 0 } },
        logger: { log: () => {}, warn: () => {}, error: () => {} },
    })
})

afterEach(async () => {
    await cleanup()
    client.clear()
})

function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('legacy bridge balance state', () => {
    it('distinguishes initial loading from a confirmed zero balance', async () => {
        const { result, waitFor } = renderHook(() => useMinterBridge(), { wrapper })
        expect(result.current.balancesLoading).toBe(true)
        expect(result.current.baseBalance).toBeUndefined()

        await waitFor(() => expect(result.current.balancesLoading).toBe(false))
        expect(result.current.baseBalance).toEqual(ZERO)
        expect(result.current.optimismBalance).toEqual(ZERO)
        expect(result.current.balancesError).toBeUndefined()
    })

    it('reports the failing chain without replacing its balance with zero', async () => {
        service.getBaseBalance.mockRejectedValue(new Error('RPC unavailable'))
        const { result, waitFor } = renderHook(() => useMinterBridge(), { wrapper })

        await waitFor(() => expect(result.current.balancesError).toContain('on Base.'))
        expect(result.current.balancesLoading).toBe(false)
        expect(result.current.baseBalance).toBeUndefined()
        expect(result.current.sourceBalance).toBeUndefined()
        expect(result.current.optimismBalance).toEqual(ZERO)
    })

    it('hides a cached balance when a refresh fails', async () => {
        const { result, waitFor } = renderHook(() => useMinterBridge(), { wrapper })
        await waitFor(() => expect(result.current.baseBalance).toEqual(ZERO))

        service.getBaseBalance.mockRejectedValue(new Error('RPC unavailable'))
        await act(async () => {
            await client.invalidateQueries({ queryKey: ['bridge', 'baseBalance', wallet.address] })
        })

        await waitFor(() => expect(result.current.balancesError).toContain('on Base.'))
        expect(result.current.baseBalance).toBeUndefined()
    })

    it('does not show loading or read balances without an account', () => {
        wallet.address = undefined
        const { result } = renderHook(() => useMinterBridge(), { wrapper })
        expect(result.current.balancesLoading).toBe(false)
        expect(result.current.balancesError).toBeUndefined()
        expect(service.getBaseBalance).not.toHaveBeenCalled()
        expect(service.getOptimismBalance).not.toHaveBeenCalled()
    })
})

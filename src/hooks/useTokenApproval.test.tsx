import { act, renderHook } from '@testing-library/react-hooks'
import { BigNumber } from 'ethers'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'

import { ApprovalState, useTokenAllowance, useTokenApproval } from './useTokenApproval'

const { contract, onError, store } = vi.hoisted(() => ({
    contract: {
        allowance: vi.fn(),
        estimateGas: { approve: vi.fn() },
        approve: vi.fn(),
    },
    onError: vi.fn(),
    store: {
        popupsModel: { setWaitingPayload: vi.fn(), setIsWaitingModalOpen: vi.fn() },
        transactionsModel: { addTransaction: vi.fn() },
    },
}))
vi.mock('./TransactionHooks', () => ({
    calculateGasMargin: (value: unknown) => value,
    handleTransactionError: onError,
}))
vi.mock('~/store', () => ({ useStoreActions: () => store }))
vi.mock('wagmi', () => ({
    useAccount: () => ({ address: 'owner' }),
    useNetwork: () => ({ chain: { id: 10 } }),
    usePublicClient: () => ({ readContract: contract.allowance }),
    erc20ABI: [],
}))
vi.mock('./useGeb', () => ({ useGeb: () => ({}) }))
vi.mock('./useContract', () => ({ useTokenContract: () => contract }))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const wrapper = ({ children }: { children?: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

beforeEach(() => {
    queryClient.clear()
    vi.resetAllMocks()
    contract.allowance.mockResolvedValue(BigNumber.from(0))
})
it('uses native token precision and never requests approval for invalid input', async () => {
    const { result, rerender, waitFor } = renderHook(
        ({ amount }) => useTokenApproval(amount, 'token', 'spender', '8', true),
        { initialProps: { amount: '1e-7' }, wrapper }
    )
    await waitFor(() => expect(contract.allowance).toHaveBeenCalled())
    expect(result.current[0]).toBe(ApprovalState.UNKNOWN)
    rerender({ amount: '0.000000001' })
    expect(result.current[0]).toBe(ApprovalState.UNKNOWN)
    rerender({ amount: '0.00000001' })
    await waitFor(() => expect(result.current[0]).toBe(ApprovalState.NOT_APPROVED))
    const estimateError = new Error('estimate unavailable')
    contract.estimateGas.approve.mockRejectedValue(estimateError)
    await act(async () => {
        await result.current[1]()
    })
    expect(contract.estimateGas.approve).toHaveBeenCalledTimes(1)
    expect(contract.estimateGas.approve.mock.calls[0][1].toString()).toBe('1')
    expect(onError).toHaveBeenCalledWith(estimateError)
    expect(contract.approve).not.toHaveBeenCalled()
    expect(result.current[0]).toBe(ApprovalState.NOT_APPROVED)
})

it('keeps the previous spender’s late allowance response out of the new approval', async () => {
    let finishFirst!: (value: bigint) => void
    contract.allowance.mockImplementationOnce(
        () =>
            new Promise<bigint>((resolve) => {
                finishFirst = resolve
            })
    )
    contract.allowance.mockResolvedValueOnce(BigInt(0))
    const { result, rerender, waitFor } = renderHook(({ spender }) => useTokenAllowance('token', 'owner', spender), {
        initialProps: { spender: 'first' },
        wrapper,
    })
    await waitFor(() => expect(contract.allowance).toHaveBeenCalledTimes(1))
    rerender({ spender: 'second' })
    await waitFor(() => expect(result.current.allowance?.toString()).toBe('0'))
    await act(async () => finishFirst(BigInt(100)))
    expect(result.current.allowance?.toString()).toBe('0')
})

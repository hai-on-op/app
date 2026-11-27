import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ethers } from 'ethers'
import { ThemeProvider } from 'styled-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AeroV2Panel } from '../AeroV2Panel'
import type { AeroV2Transaction } from '~/hooks/minter/useAeroV2'
import type { AeroV2Action, AeroV2ChainId, AeroV2Quote, LegacySourceId } from '~/services/aeroV2/types'
import { darkTheme } from '~/styles/themes'

const { useAeroV2, approve, execute, refresh, openConnectModal, switchNetworkAsync } = vi.hoisted(() => ({
    useAeroV2: vi.fn(),
    approve: vi.fn(),
    execute: vi.fn(),
    refresh: vi.fn(),
    openConnectModal: vi.fn(),
    switchNetworkAsync: vi.fn(),
}))

vi.mock('~/hooks/minter/useAeroV2', () => ({ useAeroV2 }))
vi.mock('wagmi', () => ({ useSwitchNetwork: () => ({ switchNetworkAsync }) }))
vi.mock('@rainbow-me/rainbowkit', () => ({
    // The panel has no outer RainbowKitProvider; only the shared connector owns one.
    useConnectModal: () => ({ openConnectModal: undefined }),
    darkTheme: () => ({}),
}))
vi.mock('~/components/LazyConnectButton', () => ({
    LazyConnectButton: () => (
        <button type="button" onClick={openConnectModal}>
            Connect
        </button>
    ),
}))
vi.mock('~/services/aeroV2', async () => {
    const { LEGACY_SOURCES } =
        await vi.importActual<typeof import('~/services/aeroV2/config')>('~/services/aeroV2/config')
    return { LEGACY_SOURCES }
})

const ACCOUNT = '0x1111111111111111111111111111111111111111'
const WRAPPER = '0x3333333333333333333333333333333333333333'
const HASH = `0x${'a'.repeat(64)}`
let account: string | undefined
let chainId: AeroV2ChainId
let available: boolean
let quoteEnabled: boolean
let requiresApproval: boolean
let quoteLoading: boolean
let isApproving: boolean
let isExecuting: boolean
let transactions: AeroV2Transaction[]
let lastAction: AeroV2Action

function renderPanel(props: Parameters<typeof AeroV2Panel>[0] = {}) {
    return render(
        <ThemeProvider theme={darkTheme}>
            <AeroV2Panel {...props} />
        </ThemeProvider>
    )
}

function selectOption(label: string, option: string) {
    fireEvent.click(screen.getByRole('combobox', { name: label }))
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: option }))
}

function createQuote(action: AeroV2Action): AeroV2Quote {
    const input = ethers.utils.parseEther(action.amount || '1')
    const output = action.kind === 'migrate' && action.source !== 'haiAeroV1' ? input.mul(44).div(1000) : input
    return {
        action,
        account: account || ACCOUNT,
        wrapperAddress: WRAPPER,
        inputWei: input.toString(),
        outputWei: output.toString(),
        nativeFeeWei: '0',
        tokenFeeWei: '0',
        approvals: requiresApproval
            ? action.kind === 'nft'
                ? (action.tokenIds || []).map((tokenId) => ({
                      kind: 'nft' as const,
                      tokenAddress: WRAPPER,
                      spender: WRAPPER,
                      tokenId,
                  }))
                : [{ kind: 'erc20', tokenAddress: WRAPPER, spender: WRAPPER, amountWei: input.toString() }]
            : [],
    }
}

describe('AeroV2Panel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        account = ACCOUNT
        chainId = 8453
        available = true
        quoteEnabled = true
        requiresApproval = false
        quoteLoading = false
        isApproving = false
        isExecuting = false
        transactions = []
        approve.mockResolvedValue(undefined)
        execute.mockResolvedValue(undefined)
        switchNetworkAsync.mockResolvedValue(undefined)
        useAeroV2.mockImplementation((action: AeroV2Action) => {
            lastAction = action
            const hasInput = action.kind === 'nft' ? Boolean(action.tokenIds?.length) : Boolean(action.amount)
            return {
                account,
                chainId,
                config: {
                    chainId: action.chainId,
                    chainName: action.chainId === 8453 ? 'Base' : 'Optimism',
                    underlyingSymbol: action.chainId === 8453 ? 'AERO' : 'xAERO',
                    wrapperAddress: available ? WRAPPER : undefined,
                },
                available,
                balances: {
                    underlyingWei: ethers.utils.parseEther('1000').toString(),
                    wrappedWei: ethers.utils.parseEther('1000').toString(),
                    legacy: { haiVeloV1: '0', haiVeloV2: '0', haiAeroV1: '0' },
                },
                balancesLoading: false,
                nfts: [],
                nftsLoading: false,
                quote: quoteEnabled && hasInput ? createQuote(action) : undefined,
                quoteLoading,
                error: undefined,
                isApproving,
                isExecuting,
                approve,
                execute,
                refresh,
                transactions,
                deliveryError: undefined,
            }
        })
    })

    afterEach(cleanup)

    it('keeps every write action disabled when the V3 contracts are unavailable', () => {
        available = false
        requiresApproval = true
        renderPanel()

        fireEvent.change(screen.getByLabelText('Amount to deposit'), { target: { value: '1' } })
        const unavailableButton = () => screen.getByRole('button', { name: 'haiAERO v2 is not available yet' })
        expect((unavailableButton() as HTMLButtonElement).disabled).toBe(true)
        fireEvent.click(unavailableButton())

        selectOption('Deposit', 'sAERO NFTs')
        fireEvent.change(screen.getByLabelText('sAERO NFT IDs'), { target: { value: '123' } })
        expect(lastAction.kind).toBe('nft')
        expect((unavailableButton() as HTMLButtonElement).disabled).toBe(true)
        fireEvent.click(unavailableButton())

        fireEvent.click(screen.getByRole('button', { name: 'Migrate' }))
        fireEvent.change(screen.getByLabelText('Amount to migrate'), { target: { value: '1000' } })
        expect((unavailableButton() as HTMLButtonElement).disabled).toBe(true)
        fireEvent.click(unavailableButton())

        fireEvent.click(screen.getByRole('button', { name: 'Bridge' }))
        fireEvent.change(screen.getByLabelText('Amount to bridge'), { target: { value: '1' } })
        expect((unavailableButton() as HTMLButtonElement).disabled).toBe(true)
        fireEvent.click(unavailableButton())

        expect(screen.queryByRole('button', { name: /^Approve/ })).toBeNull()
        expect(approve).not.toHaveBeenCalled()
        expect(execute).not.toHaveBeenCalled()
    })

    it('uses the scoped wallet connector when the panel has no RainbowKit provider', () => {
        account = undefined
        renderPanel()
        fireEvent.change(screen.getByLabelText('Amount to deposit'), { target: { value: '1' } })
        const connectButton = screen.getByRole('button', { name: 'Connect' }) as HTMLButtonElement
        expect(connectButton.disabled).toBe(false)
        fireEvent.click(connectButton)

        expect(openConnectModal).toHaveBeenCalledOnce()
        expect(approve).not.toHaveBeenCalled()
        expect(execute).not.toHaveBeenCalled()
    })

    it.each([10, 8453] as const)('keeps the connected %s wallet on the v2 action flow', (connectedChain) => {
        chainId = connectedChain
        renderPanel()
        selectOption('Minting network', connectedChain === 10 ? 'Optimism' : 'Base')
        fireEvent.change(screen.getByLabelText('Amount to deposit'), { target: { value: '1' } })
        expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull()
        expect(screen.queryByRole('button', { name: /Switch/ })).toBeNull()
        expect((screen.getByRole('button', { name: 'Mint haiAERO v2' }) as HTMLButtonElement).disabled).toBe(false)
        expect(openConnectModal).not.toHaveBeenCalled()
    })

    it('offers a network switch instead of writing on the wrong chain', () => {
        chainId = 10
        renderPanel()
        fireEvent.change(screen.getByLabelText('Amount to deposit'), { target: { value: '1' } })
        fireEvent.click(screen.getByRole('button', { name: 'Switch to Base' }))

        expect(switchNetworkAsync).toHaveBeenCalledWith(8453)
        expect(approve).not.toHaveBeenCalled()
        expect(execute).not.toHaveBeenCalled()
    })

    it('offers AERO and NFT deposits on Base, then only xAERO on Optimism', () => {
        renderPanel()
        expect(screen.getByRole('combobox', { name: 'Deposit' }).textContent).toBe('AERO')
        selectOption('Deposit', 'sAERO NFTs')
        fireEvent.change(screen.getByLabelText('sAERO NFT IDs'), { target: { value: '123, 456' } })
        expect(lastAction).toMatchObject({ kind: 'nft', chainId: 8453, tokenIds: ['123', '456'] })

        selectOption('Minting network', 'Optimism')
        expect(screen.queryByLabelText('Deposit')).toBeNull()
        expect(screen.queryByLabelText('sAERO NFT IDs')).toBeNull()
        expect(screen.getByText('xAERO')).toBeTruthy()
        expect(lastAction).toMatchObject({ kind: 'deposit', chainId: 10, amount: '' })
        expect(lastAction.tokenIds).toBeUndefined()
    })

    it.each<[LegacySourceId, string, string]>([
        ['haiVeloV1', 'haiVELO v1', '44.0 haiAERO'],
        ['haiVeloV2', 'haiVELO v2', '44.0 haiAERO'],
        ['haiAeroV1', 'haiAERO v1', '1000.0 haiAERO'],
    ])('previews the %s conversion on Optimism before contracts are available', (source, label, preview) => {
        available = false
        quoteEnabled = false
        renderPanel()
        fireEvent.click(screen.getByRole('button', { name: 'Migrate' }))
        selectOption('Token to migrate', label)
        fireEvent.change(screen.getByLabelText('Amount to migrate'), { target: { value: '1000' } })

        expect(lastAction).toEqual({ kind: 'migrate', chainId: 10, amount: '1000', source })
        expect(screen.getByText(preview)).toBeTruthy()
        expect(
            (screen.getByRole('button', { name: 'haiAERO v2 is not available yet' }) as HTMLButtonElement).disabled
        ).toBe(true)
    })

    it('opens the legacy bridge without invoking a V3 transaction', () => {
        const onLegacyBridge = vi.fn()
        renderPanel({ onLegacyBridge })
        fireEvent.click(screen.getByRole('button', { name: 'Migrate' }))
        fireEvent.click(screen.getByRole('button', { name: /Bridge old haiAERO to OP/ }))

        expect(onLegacyBridge).toHaveBeenCalledOnce()
        expect(approve).not.toHaveBeenCalled()
        expect(execute).not.toHaveBeenCalled()
    })

    it('never offers approval for bridging even if a quote contains an approval entry', () => {
        requiresApproval = true
        renderPanel()
        fireEvent.click(screen.getByRole('button', { name: 'Bridge' }))
        fireEvent.change(screen.getByLabelText('Amount to bridge'), { target: { value: '1' } })

        expect(screen.queryByRole('button', { name: /^Approve/ })).toBeNull()
        fireEvent.click(screen.getByRole('button', { name: 'Bridge to Optimism' }))
        expect(execute).toHaveBeenCalledOnce()
        expect(approve).not.toHaveBeenCalled()
    })

    it('disables submission while a new quote is pending', () => {
        quoteLoading = true
        renderPanel()
        fireEvent.change(screen.getByLabelText('Amount to deposit'), { target: { value: '1' } })
        const button = screen.getByRole('button', { name: 'Checking…' })
        expect((button as HTMLButtonElement).disabled).toBe(true)
        fireEvent.click(button)
        expect(execute).not.toHaveBeenCalled()
    })

    it.each<LegacySourceId>(['haiVeloV1', 'haiVeloV2', 'haiAeroV1'])(
        'opens the requested migration source %s directly',
        (source) => {
            renderPanel({ initialMode: 'migrate', initialSource: source })
            const label = { haiVeloV1: 'haiVELO v1', haiVeloV2: 'haiVELO v2', haiAeroV1: 'haiAERO v1' }[source]
            expect(screen.getByRole('combobox', { name: 'Token to migrate' }).textContent).toBe(label)
            expect(lastAction).toMatchObject({ kind: 'migrate', chainId: 10, source })
            expect(screen.queryByRole('combobox', { name: 'Minting network' })).toBeNull()
        }
    )

    it.each(['mint', 'migrate', 'bridge'] as const)('clears the amount only after %s confirms', async (mode) => {
        chainId = mode === 'migrate' ? 10 : 8453
        execute.mockResolvedValue({ hash: HASH, chainId, kind: mode === 'mint' ? 'deposit' : mode })
        renderPanel({ initialMode: mode })
        const input = screen.getByRole('spinbutton') as HTMLInputElement
        fireEvent.change(input, { target: { value: '10' } })
        const name =
            mode === 'mint' ? 'Mint haiAERO v2' : mode === 'migrate' ? 'Migrate to haiAERO v2' : 'Bridge to Optimism'
        fireEvent.click(screen.getByRole('button', { name }))
        await waitFor(() => expect(input.value).toBe(''))
        expect(execute).toHaveBeenCalledOnce()
        expect(approve).not.toHaveBeenCalled()
    })

    it('retains the entered amount when execution does not return a confirmed result', async () => {
        renderPanel()
        const input = screen.getByLabelText('Amount to deposit') as HTMLInputElement
        fireEvent.change(input, { target: { value: '10' } })
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Mint haiAERO v2' }))
        })
        expect(execute).toHaveBeenCalledOnce()
        expect(input.value).toBe('10')
    })

    it('retains the entered amount after token approval', async () => {
        requiresApproval = true
        renderPanel()
        const input = screen.getByLabelText('Amount to deposit') as HTMLInputElement
        fireEvent.change(input, { target: { value: '10' } })
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Approve AERO' }))
        })
        expect(approve).toHaveBeenCalledOnce()
        expect(execute).not.toHaveBeenCalled()
        expect(input.value).toBe('10')
    })

    it('identifies the next NFT approval and keeps the selected IDs after approving', async () => {
        requiresApproval = true
        renderPanel()
        selectOption('Deposit', 'sAERO NFTs')
        const input = screen.getByLabelText('sAERO NFT IDs') as HTMLInputElement
        fireEvent.change(input, { target: { value: '123, 456' } })
        expect(screen.getByText(/2 NFT approvals remaining/)).toBeTruthy()
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Approve sAERO NFT #123' }))
        })
        expect(approve).toHaveBeenCalledOnce()
        expect(execute).not.toHaveBeenCalled()
        expect(input.value).toBe('123, 456')
    })

    it.each([false, true])('clears NFT IDs only after confirmed execution: %s', async (confirmed) => {
        execute.mockResolvedValue(confirmed ? { hash: HASH, chainId: 8453, kind: 'nft' } : undefined)
        renderPanel()
        selectOption('Deposit', 'sAERO NFTs')
        const input = screen.getByLabelText('sAERO NFT IDs') as HTMLInputElement
        fireEvent.change(input, { target: { value: '123, 456' } })
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Mint haiAERO v2' }))
        })
        expect(execute).toHaveBeenCalledOnce()
        expect(input.value).toBe(confirmed ? '' : '123, 456')
    })

    it.each(['approval', 'execution'])('disables selectors and Max during %s', (operation) => {
        const { rerender } = renderPanel()
        const input = screen.getByLabelText('Amount to deposit') as HTMLInputElement
        fireEvent.click(screen.getByText('Available: 1000.0'))
        expect(input.value).toBe('1000.0')
        fireEvent.change(input, { target: { value: '10' } })
        isApproving = operation === 'approval'
        isExecuting = operation === 'execution'
        rerender(
            <ThemeProvider theme={darkTheme}>
                <AeroV2Panel />
            </ThemeProvider>
        )
        fireEvent.click(screen.getByText('Available: 1000.0'))
        expect(input.value).toBe('10')
        expect(input.disabled).toBe(true)
        for (const select of screen.getAllByRole('combobox')) {
            expect((select as HTMLButtonElement).disabled).toBe(true)
            fireEvent.click(select)
        }
        expect(screen.queryByRole('listbox')).toBeNull()
        expect(execute).not.toHaveBeenCalled()
        expect(approve).not.toHaveBeenCalled()
    })

    it('labels source confirmation as delivery pending until the destination message is confirmed', () => {
        transactions = [
            {
                hash: HASH,
                chainId: 10,
                kind: 'bridge',
                account: ACCOUNT,
                outputWei: ethers.utils.parseEther('1').toString(),
                createdAt: 1,
                delivered: false,
                destinationChainId: 8453,
                wrapperAddress: WRAPPER,
                destinationWrapperAddress: WRAPPER,
                messageId: `0x${'b'.repeat(64)}`,
            },
        ]
        const { rerender } = renderPanel()
        expect(screen.getByText('Confirmed on Optimism; delivery pending')).toBeTruthy()
        expect(screen.queryByText('Delivered to Base')).toBeNull()

        transactions = [{ ...transactions[0], delivered: true }]
        rerender(
            <ThemeProvider theme={darkTheme}>
                <AeroV2Panel />
            </ThemeProvider>
        )
        expect(screen.getByText('Delivered to Base')).toBeTruthy()
        expect(screen.queryByText('Confirmed on Optimism; delivery pending')).toBeNull()
    })
})

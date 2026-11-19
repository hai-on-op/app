import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { afterEach, expect, it, vi } from 'vitest'
import { darkTheme } from '~/styles/themes'
import type { ModalProps } from './index'
import { WrapETHModal } from './WrapETHModal'

vi.mock('wagmi', () => ({
    useAccount: () => ({ address: '0x0000000000000000000000000000000000000001' }),
    useNetwork: () => ({ chain: { id: 8453 } }),
    useBalance: () => ({ data: { formatted: '2.0' }, refetch: vi.fn() }),
}))
vi.mock('~/hooks', () => ({ useEthersSigner: () => ({}), handleTransactionError: vi.fn() }))
vi.mock('~/store', () => ({
    useStoreState: () => ({ ethBalance: { 8453: '1.010000000000000001' } }),
    useStoreActions: () => ({ connectWalletModel: {}, popupsModel: {}, vaultModel: {} }),
}))
vi.mock('./index', () => ({
    Modal: ({ children, footerContent }: ModalProps) => (
        <>
            {children}
            {footerContent}
        </>
    ),
}))
vi.mock('../TransactionSummary', () => ({ TransactionSummary: () => null }))

afterEach(cleanup)

it('preserves the gas cushion in wei and only enables affordable, representable wrap amounts', () => {
    render(
        <ThemeProvider theme={darkTheme}>
            <WrapETHModal />
        </ThemeProvider>
    )
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    const wrap = screen.getByRole('button', { name: 'Wrap' }) as HTMLButtonElement
    fireEvent.click(screen.getByText(/^Max /))
    expect(input.value).toBe('1.000000000000000001')
    expect(wrap.disabled).toBe(false)
    for (const amount of ['1.010000000000000002', '1e-7', '0.0000000000000000001']) {
        fireEvent.change(input, { target: { value: amount } })
        expect(wrap.disabled).toBe(true)
    }
})

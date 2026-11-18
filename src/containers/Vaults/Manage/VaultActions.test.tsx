import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { darkTheme } from '~/styles/themes'
import { VaultAction } from '~/utils'
import { VaultActions } from './VaultActions'

const { useVaultMock, updateForm, toggleModal } = vi.hoisted(() => ({
    useVaultMock: vi.fn(),
    updateForm: vi.fn(),
    toggleModal: vi.fn(),
}))

vi.mock('~/providers/VaultProvider', () => ({ useVault: useVaultMock }))
vi.mock('~/store', () => ({
    useStoreState: () => ({ vaultModel: {} }),
    useStoreActions: () => ({ vaultModel: {}, popupsModel: { toggleModal } }),
}))
vi.mock('./VaultActionError', () => ({ VaultActionError: () => null }))
vi.mock('~/components/Modal/VaultTxModal', () => ({ VaultTxModal: () => null }))
vi.mock('~/components/Modal/WrapETHModal', () => ({ WrapETHModal: () => null }))

function renderRepayment(balance: string, payoff: string, repayAll = false) {
    const value = (raw: string) => ({ raw, formatted: raw })
    useVaultMock.mockReturnValue({
        action: VaultAction.WITHDRAW_REPAY,
        setAction: vi.fn(),
        updateForm,
        formState: { repay: '0', repayAll },
        vault: { id: '1' },
        collateral: { name: 'WETH', balance: value('1') },
        debt: { available: value('5'), balance: value(balance), payoff: value(payoff), total: { current: value('2') } },
        summary: {},
    })
    return render(
        <ThemeProvider theme={darkTheme}>
            <VaultActions />
        </ThemeProvider>
    )
}

describe('vault repayment controls', () => {
    afterEach(cleanup)

    it.each([
        ['1', '1.000000000000000001', '1', false],
        ['1.000000000000000001', '1.000000000000000001', '1.000000000000000001', true],
    ] as const)('selects the affordable Max for wallet %s and payoff %s', (balance, payoff, amount, full) => {
        renderRepayment(balance, payoff)
        fireEvent.click(screen.getByText('Max ' + amount + ' HAI'))
        expect(updateForm).toHaveBeenLastCalledWith({ repay: amount, repayAll: full })
        fireEvent.change(screen.getByPlaceholderText('Pay Back Amount'), { target: { value: '0.5' } })
        expect(updateForm).toHaveBeenLastCalledWith({ repay: '0.5', repayAll: false })
    })

    it('enables a full payoff covered entirely by internal HAI credit', () => {
        renderRepayment('0', '0', true)
        expect(screen.getByText('Covered by internal HAI credit')).toBeTruthy()
        expect((screen.getByRole('button', { name: 'Review Pay Back All' }) as HTMLButtonElement).disabled).toBe(false)
    })
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { afterEach, expect, it, vi } from 'vitest'
import { darkTheme } from '~/styles/themes'
import { ActionState, DEFAULT_VAULT_DATA, NETWORK_ID, VaultAction } from '~/utils'
import { Confirm } from './Confirm'

const actions = {
    vaultModel: {
        submitVaultLeg: vi.fn(),
        repayAndWithdraw: vi.fn(),
        setTransactionState: vi.fn(),
        setVaultData: vi.fn(),
        fetchUserVaults: vi.fn(),
    },
    connectWalletModel: { setIsStepLoading: vi.fn(), setForceUpdateTokens: vi.fn() },
    popupsModel: { setIsWaitingModalOpen: vi.fn(), setWaitingPayload: vi.fn() },
}
const initialVaultData = { ...DEFAULT_VAULT_DATA, deposit: '', repay: '10', withdraw: '4', totalDebt: '100' }
const vaultData = { ...initialVaultData, repayAll: false }
const wallet = { chainId: NETWORK_ID }
let action = VaultAction.DEPOSIT_REPAY
vi.mock('wagmi', async () => ({
    ...(await vi.importActual<typeof import('wagmi')>('wagmi')),
    useAccount: () => ({ address: 'owner' }),
    useNetwork: () => ({ chain: { id: wallet.chainId } }),
}))
vi.mock('~/hooks', () => ({ useEthersSigner: () => ({}), useGeb: () => ({}) }))
vi.mock('~/components/TransactionSummary', () => ({ TransactionSummary: () => null }))
vi.mock('../index', () => ({
    ModalBody: 'div',
    ModalFooter: ({ children }: { children: ReactNode }) => <footer>{children}</footer>,
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('~/store', () => ({
    useStoreState: () => ({
        connectWalletModel: {},
        vaultModel: { vaultData, singleVault: { id: '17' }, transactionState: ActionState.NONE },
    }),
    useStoreActions: () => actions,
}))
vi.mock('~/providers/VaultProvider', () => ({
    useVault: () => {
        const values = { after: { formatted: '0' } }
        return {
            action,
            updateForm: vi.fn(),
            collateral: { name: 'WETH' },
            summary: { collateral: values, debt: values, collateralRatio: values, liquidationPrice: values },
        }
    },
}))

function showConfirm(onClose = vi.fn()) {
    return render(
        <ThemeProvider theme={darkTheme}>
            <MemoryRouter>
                <Confirm onClose={onClose} />
            </MemoryRouter>
        </ThemeProvider>
    )
}
afterEach(() => {
    vi.clearAllMocks()
    actions.vaultModel.submitVaultLeg.mockReset()
    wallet.chainId = NETWORK_ID
    action = VaultAction.DEPOSIT_REPAY
    Object.assign(vaultData, initialVaultData, { repayAll: false })
})
it.each(['', '0.5'])('only submits the active legs for deposit "%s" with an inactive withdrawal', async (deposit) => {
    vaultData.deposit = deposit
    actions.vaultModel.submitVaultLeg.mockResolvedValue({ hash: 'submitted', wait: vi.fn() })
    const onClose = vi.fn()
    showConfirm(onClose)
    fireEvent.click(screen.getByRole('button', { name: /Confirm Transaction/ }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(actions.vaultModel.submitVaultLeg.mock.calls.map(([payload]) => payload.leg)).toEqual(
        deposit ? ['deposit', 'repay'] : ['repay']
    )
    expect(actions.vaultModel.repayAndWithdraw).not.toHaveBeenCalled()
})
it.each([
    [VaultAction.DEPOSIT_REPAY, 'deposit', 'repay', 'repayment'],
    [VaultAction.WITHDRAW_BORROW, 'withdraw', 'borrow', 'borrowing transaction'],
] as const)(
    'awaits the first receipt and dismisses the combined %s review when the second signature is rejected',
    async (selectedAction, firstLeg, secondLeg, remaining) => {
        action = selectedAction
        Object.assign(vaultData, { deposit: '1', borrow: '2' })
        let confirmFirst!: () => void
        const receipt = new Promise<void>((resolve) => {
            confirmFirst = resolve
        })
        actions.vaultModel.submitVaultLeg
            .mockResolvedValueOnce({ hash: 'firstHash', wait: () => receipt })
            .mockRejectedValueOnce({ code: 4001 })
        const onClose = vi.fn()
        showConfirm(onClose)
        fireEvent.click(screen.getByRole('button', { name: /Confirm Transaction/ }))
        await waitFor(() => expect(actions.vaultModel.submitVaultLeg).toHaveBeenCalledTimes(1))
        confirmFirst()
        await waitFor(() => expect(onClose).toHaveBeenCalled())
        expect(actions.vaultModel.submitVaultLeg.mock.calls.map(([payload]) => payload.leg)).toEqual([
            firstLeg,
            secondLeg,
        ])
        expect(actions.vaultModel.setVaultData).toHaveBeenCalledWith(DEFAULT_VAULT_DATA)
        expect(actions.vaultModel.fetchUserVaults).toHaveBeenCalled()
        expect(actions.popupsModel.setWaitingPayload).toHaveBeenLastCalledWith(
            expect.objectContaining({
                hash: 'firstHash',
                text: expect.stringContaining(remaining + ' was not submitted'),
            })
        )
    }
)
it('submits an explicitly selected full payoff when internal HAI credit covers the entire wallet amount', async () => {
    Object.assign(vaultData, { deposit: '', repay: '0', repayAll: true })
    actions.vaultModel.submitVaultLeg.mockResolvedValue({ hash: 'payoffHash', wait: vi.fn() })
    const onClose = vi.fn()
    showConfirm(onClose)
    expect(screen.getByText(/settles its full debt/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Confirm Transaction/ }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(actions.vaultModel.submitVaultLeg.mock.calls.map(([payload]) => payload.leg)).toEqual(['repay'])
})

it('disables confirmation if the wallet switched off the vault network', () => {
    wallet.chainId = NETWORK_ID + 1
    showConfirm()
    expect((screen.getByRole('button', { name: /Confirm Transaction/ }) as HTMLButtonElement).disabled).toBe(true)
})

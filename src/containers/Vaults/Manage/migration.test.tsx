import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { darkTheme } from '~/styles/themes'

const { vaultState } = vi.hoisted(() => ({ vaultState: { collateralName: 'HAIVELOV2', id: '123' } }))
vi.mock('~/utils', async () => ({
    ...(await vi.importActual<typeof import('~/utils/constants')>('~/utils/constants')),
    VaultAction: { CREATE: 'create', DEPOSIT_BORROW: 'manage' },
}))
vi.mock('~/providers/VaultProvider', () => ({
    useVault: () => ({ action: 'manage', vault: vaultState, updateForm: vi.fn() }),
}))
vi.mock('~/hooks', () => ({ useMediaQuery: () => false, useVaultById: () => ({ vault: vaultState }) }))
vi.mock('~/components/TokenArray', () => ({ RewardsTokenArray: () => <div>Reward claims available</div> }))
vi.mock('~/components/ProxyPrompt', () => ({ ProxyPrompt: ({ children }: any) => <>{children}</> }))
vi.mock('./Overview', () => ({ Overview: () => <div>Vault overview</div> }))
vi.mock('./VaultActions', () => ({ VaultActions: () => <div>Deposit, repay and withdraw controls</div> }))
vi.mock('./ManageDropdown', () => ({ ManageDropdown: () => <div>Existing vault selector</div> }))
vi.mock('../VaultById/ActivityTable', () => ({ ActivityTable: () => <div>Existing activity</div> }))
vi.mock('./Minter', () => ({ BridgeTab: () => <div>Existing bridge</div> }))
vi.mock('~/providers/MinterProtocolProvider', () => ({
    MinterProtocolProvider: ({ children }: any) => <>{children}</>,
}))
vi.mock('~/components/Modal/MigrateHaiVeloV2Modal', () => ({ MigrateHaiVeloV2Modal: () => null }))
vi.mock('~/components/NavContainer', () => ({
    NavContainer: ({ navItems, onSelect, headerContent, children }: any) => (
        <div>
            {navItems.map((item: string, i: number) => (
                <button key={item} onClick={() => onSelect(i)}>
                    {item}
                </button>
            ))}
            {headerContent}
            {children}
        </div>
    ),
}))

import { ManageVault } from './index'

describe('legacy vault access during AERO migration', () => {
    beforeEach(() => window.history.replaceState({}, '', '/vaults/manage'))

    it.each(['HAIVELOV2', 'HAIAERO'])('replaces new %s wrapping with guidance and retains management', (symbol) => {
        vaultState.collateralName = symbol
        render(
            <ThemeProvider theme={darkTheme}>
                <MemoryRouter>
                    <ManageVault />
                </MemoryRouter>
            </ThemeProvider>
        )
        fireEvent.click(screen.getByRole('button', { name: 'Migration' }))
        expect(screen.getByText(/New legacy minting is unavailable/)).not.toBeNull()
        expect(screen.queryByText('Deposit, repay and withdraw controls')).toBeNull()
        fireEvent.click(screen.getByRole('button', { name: 'Manage' }))
        expect(screen.getByText('Deposit, repay and withdraw controls')).not.toBeNull()
        expect(screen.getByText('Existing vault selector')).not.toBeNull()
        fireEvent.click(screen.getByRole('button', { name: 'Activity' }))
        expect(screen.getByText('Existing activity')).not.toBeNull()
    })
})

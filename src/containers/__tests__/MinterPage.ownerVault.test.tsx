import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VaultAction } from '~/utils'
import { HaiAeroPage, HaiVeloPage } from '../MinterPage'

const mocks = vi.hoisted(() => ({
    vaults: [] as {
        id: string
        collateralName: string
        collateral: string
        totalDebt: string
        freeCollateral: string
    }[],
    actions: { setSingleVault: vi.fn(), setVaultData: vi.fn() },
}))
vi.mock('~/store', () => ({
    useStoreState: () => ({ vaultModel: { list: mocks.vaults } }),
    useStoreActions: () => ({ vaultModel: mocks.actions }),
}))
vi.mock('~/providers/VaultProvider', () => ({
    VaultProvider: ({ action }: { action: number }) => <div data-testid="action">{action}</div>,
}))
vi.mock('~/containers/Vaults/Manage', () => ({ ManageVault: () => null }))

describe('dedicated minter vault selection', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it.each([
        { symbol: 'HAIVELOV2', Page: HaiVeloPage },
        { symbol: 'HAIAERO', Page: HaiAeroPage },
    ])('keeps the $symbol vault with claimable collateral in manage mode', ({ symbol, Page }) => {
        const empty = { id: '1', collateralName: symbol, collateral: '0', totalDebt: '0', freeCollateral: '0.0' }
        const claimable = { ...empty, id: '2', freeCollateral: '0.01' }
        mocks.vaults = [empty, claimable]

        const view = render(<Page />)
        expect(mocks.actions.setSingleVault).toHaveBeenLastCalledWith(claimable)
        expect(screen.getByTestId('action').textContent).toBe(String(VaultAction.DEPOSIT_BORROW))

        mocks.vaults = [empty]
        view.rerender(<Page />)
        expect(mocks.actions.setSingleVault).toHaveBeenLastCalledWith(undefined)
        expect(screen.getByTestId('action').textContent).toBe(String(VaultAction.CREATE))
    })
})

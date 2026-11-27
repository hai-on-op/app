import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useHistory } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ManageVault } from '..'
import { darkTheme } from '~/styles/themes'
import { VaultAction } from '~/utils'

const { useVault, updateForm } = vi.hoisted(() => ({ useVault: vi.fn(), updateForm: vi.fn() }))

vi.mock('~/providers/VaultProvider', () => ({ useVault }))
vi.mock('~/hooks', () => ({ useMediaQuery: () => false, useVaultById: () => ({ vault: undefined }) }))
vi.mock('~/components/ProxyPrompt', () => ({
    ProxyPrompt: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('~/providers/HaiVeloProvider', () => ({
    HaiVeloProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('~/providers/MinterProtocolProvider', () => ({
    MinterProtocolProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('~/components/TokenArray', () => ({ RewardsTokenArray: () => <div>Legacy rewards</div> }))
vi.mock('~/components/Modal/MigrateHaiVeloV2Modal', () => ({ MigrateHaiVeloV2Modal: () => null }))
vi.mock('../Overview', () => ({ Overview: () => <div>Legacy vault overview</div> }))
vi.mock('../HaiVeloOverview', () => ({ HaiVeloOverview: () => <div>Legacy haiVELO overview</div> }))
vi.mock('../VaultActions', () => ({ VaultActions: () => <div>Legacy vault actions</div> }))
vi.mock('../MintHaiVeloActions', () => ({ MintHaiVeloActions: () => <div>Legacy haiVELO mint form</div> }))
vi.mock('../ManageDropdown', () => ({ ManageDropdown: () => <div>Legacy vault selector</div> }))
vi.mock('../../VaultById/ActivityTable', () => ({ ActivityTable: () => <div>Legacy vault activity</div> }))
vi.mock('../Minter', () => ({
    MinterOverview: () => <div>Legacy haiAERO overview</div>,
    MintActions: () => <div>Legacy haiAERO mint form</div>,
    BridgeTab: ({ initialDirection }: { initialDirection?: string }) => (
        <div>Legacy haiAERO bridge: {initialDirection}</div>
    ),
}))
vi.mock('../Minter/AeroV2Panel', () => ({
    AeroV2Panel: ({
        initialMode,
        initialSource,
        onLegacyBridge,
    }: {
        initialMode: string
        initialSource: string
        onLegacyBridge: () => void
    }) => (
        <section aria-label="haiAERO v2 form">
            <div>Initial action: {initialMode}</div>
            <div>Migration source: {initialSource}</div>
            <button onClick={onLegacyBridge}>Bridge old tokens to Optimism</button>
        </section>
    ),
}))

function renderRoute(path: string) {
    let history!: ReturnType<typeof useHistory>
    function RouteContent() {
        history = useHistory()
        return <ManageVault />
    }
    const content = () => (
        <MemoryRouter initialEntries={[path]}>
            <ThemeProvider theme={darkTheme}>
                <RouteContent />
            </ThemeProvider>
        </MemoryRouter>
    )
    const view = render(content())
    return { history, rerender: () => view.rerender(content()) }
}

describe('haiAERO v2 route integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        useVault.mockReturnValue({ action: VaultAction.CREATE, vault: undefined, updateForm })
    })

    afterEach(cleanup)

    it('opens the new mint form by default on haiAERO without legacy rewards or vault controls', () => {
        renderRoute('/haiAERO')

        expect(screen.getByRole('region', { name: 'haiAERO v2 form' })).toBeTruthy()
        expect(screen.getByText('Initial action: mint')).toBeTruthy()
        expect(screen.queryByText('Legacy haiAERO mint form')).toBeNull()
        expect(screen.queryByText('Legacy rewards')).toBeNull()
        expect(screen.queryByText('Legacy vault selector')).toBeNull()
    })

    it('keeps the v2 action selected when an existing wallet vault finishes loading', () => {
        const { rerender } = renderRoute('/haiAERO?tab=aero-v2&mode=bridge')
        expect(screen.getByText('Initial action: bridge')).toBeTruthy()

        useVault.mockReturnValue({
            action: VaultAction.DEPOSIT_BORROW,
            vault: { id: '42', collateralName: 'HAIAERO' },
            updateForm,
        })
        rerender()

        expect(screen.getByText('Initial action: bridge')).toBeTruthy()
        expect(screen.queryByText('Legacy vault actions')).toBeNull()
    })

    it('uses the destination page instead of stale vault state when changing minter routes', () => {
        useVault.mockReturnValue({
            action: VaultAction.DEPOSIT_BORROW,
            vault: { id: '21', collateralName: 'HAIVELOV2' },
            updateForm,
        })
        const { history } = renderRoute('/haiVELO?tab=aero-v2')
        expect(screen.getByText('Initial action: migrate')).toBeTruthy()

        act(() => history.push('/haiAERO'))
        expect(screen.getByText('Initial action: mint')).toBeTruthy()
        expect(screen.getByText('Migration source: haiAeroV1')).toBeTruthy()
        fireEvent.click(screen.getByRole('button', { name: 'Mint haiAERO v1' }))
        expect(screen.getByText('Legacy haiAERO mint form')).toBeTruthy()
        expect(screen.queryByText('Legacy haiVELO mint form')).toBeNull()
    })

    it('uses stable tab URLs and supports browser back navigation between new and legacy actions', () => {
        const { history } = renderRoute('/haiAERO?tab=aero-v2&mode=migrate')
        fireEvent.click(screen.getByRole('button', { name: 'Mint haiAERO v1' }))
        expect(new URLSearchParams(history.location.search).get('tab')).toBe('legacy-mint')
        expect(new URLSearchParams(history.location.search).has('mode')).toBe(false)
        expect(screen.getByText('Legacy haiAERO mint form')).toBeTruthy()

        fireEvent.click(screen.getByRole('button', { name: 'Create legacy vault' }))
        expect(new URLSearchParams(history.location.search).get('tab')).toBe('manage')
        expect(screen.getByText('Legacy vault actions')).toBeTruthy()

        act(() => history.goBack())
        expect(screen.getByText('Legacy haiAERO mint form')).toBeTruthy()
        act(() => history.goBack())
        expect(screen.getByText('Initial action: migrate')).toBeTruthy()
    })

    it('opens the legacy Base-to-Optimism bridge from the v2 migration flow and restores v2 on back', () => {
        const { history } = renderRoute('/haiAERO?tab=aero-v2&mode=migrate')
        fireEvent.click(screen.getByRole('button', { name: 'Bridge old tokens to Optimism' }))

        expect(history.location.search).toBe('?tab=legacy-bridge')
        expect(screen.getByText('Legacy haiAERO bridge: base-to-optimism')).toBeTruthy()
        expect(screen.queryByRole('region', { name: 'haiAERO v2 form' })).toBeNull()

        fireEvent.click(screen.getByRole('button', { name: 'Continue to migration' }))
        expect(screen.getByText('Initial action: migrate')).toBeTruthy()
        expect(screen.getByText('Migration source: haiAeroV1')).toBeTruthy()

        act(() => history.goBack())
        expect(screen.getByText('Legacy haiAERO bridge: base-to-optimism')).toBeTruthy()
        act(() => history.goBack())
        expect(screen.getByText('Initial action: migrate')).toBeTruthy()
    })

    it('initializes haiVELO migration with the matching legacy source', () => {
        renderRoute('/haiVELO?tab=aero-v2')

        expect(screen.getByText('Initial action: migrate')).toBeTruthy()
        expect(screen.getByText('Migration source: haiVeloV2')).toBeTruthy()
        expect(screen.queryByText('Legacy haiVELO mint form')).toBeNull()
    })

    it('lets haiVELO v1 vault owners enter the new migration without mixing in the old migration modal', () => {
        useVault.mockReturnValue({
            action: VaultAction.DEPOSIT_BORROW,
            vault: { id: '12', collateralName: 'HAIVELO' },
            updateForm,
        })
        const { history } = renderRoute('/vaults/manage?id=12')
        expect(screen.getByText('Legacy vault actions')).toBeTruthy()

        fireEvent.click(screen.getByRole('button', { name: 'Migrate to haiAERO v2' }))

        expect(new URLSearchParams(history.location.search).get('id')).toBe('12')
        expect(screen.getByText('Initial action: migrate')).toBeTruthy()
        expect(screen.getByText('Migration source: haiVeloV1')).toBeTruthy()
        expect(screen.queryByRole('button', { name: 'Migrate to haiVELO v2' })).toBeNull()
    })

    it('keeps legacy vault management and activity reachable by direct links', () => {
        useVault.mockReturnValue({
            action: VaultAction.DEPOSIT_BORROW,
            vault: { id: '42', collateralName: 'HAIAERO' },
            updateForm,
        })
        const { history } = renderRoute('/haiAERO?tab=manage')
        expect(screen.getByText('Legacy vault actions')).toBeTruthy()
        expect(screen.getByText('Legacy vault selector')).toBeTruthy()
        expect(screen.queryByRole('region', { name: 'haiAERO v2 form' })).toBeNull()

        act(() => history.push('/haiAERO?tab=activity'))
        expect(screen.getByText('Legacy vault activity')).toBeTruthy()
    })
})

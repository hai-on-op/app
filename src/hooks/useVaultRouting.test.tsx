import type { ReactNode } from 'react'
import { renderHook } from '@testing-library/react-hooks'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { VaultAction } from '~/utils'
import { useVaultRouting } from './useVaultRouting'

const mocks = vi.hoisted(() => ({
    tokens: {} as Record<string, { isCollateral: boolean }>,
    vaults: [{ id: '7', collateralName: 'ALETH' }],
    isOpenable: vi.fn(),
    actions: { setVaultData: vi.fn(), setSingleVault: vi.fn() },
}))
vi.mock('~/providers/AnalyticsProvider', () => ({
    useAnalytics: () => ({ isOpenableCollateral: mocks.isOpenable }),
}))
vi.mock('~/store', () => ({
    useStoreState: () => ({
        connectWalletModel: { tokensData: mocks.tokens },
        vaultModel: { list: mocks.vaults },
    }),
    useStoreActions: () => ({ vaultModel: mocks.actions }),
}))
vi.mock('wagmi', () => ({ useAccount: () => ({}), useNetwork: () => ({}) }))
vi.mock('./useEthersAdapters', () => ({ useEthersSigner: () => undefined }))
vi.mock('./useGeb', () => ({ useGeb: () => undefined }))

function renderRoute(path: string) {
    return renderHook(() => useVaultRouting(), {
        wrapper: ({ children }: { children?: ReactNode }) => (
            <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
        ),
    })
}

describe('vault collateral routing', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.tokens = {
            WETH: { isCollateral: true },
            ALETH: { isCollateral: true },
            HAIVELOV2: { isCollateral: true },
        }
        mocks.isOpenable.mockImplementation((symbol) => symbol !== 'ALETH')
    })

    it.each(['ALETH', 'UNKNOWN'])('returns a closed or unknown %s open link to the vault list', (symbol) => {
        const { result } = renderRoute(`/vaults/open?collateral=${symbol}`)
        expect(result.current.location.pathname + result.current.location.search).toBe('/vaults?tab=available')
        expect(result.current.action).toBe(VaultAction.INFO)
    })

    it('waits for token metadata and preserves the selected open collateral', () => {
        mocks.tokens = {}
        const { result, rerender } = renderRoute('/vaults/open?collateral=HAIVELOV2')
        expect(result.current.location.pathname).toBe('/vaults/open')
        expect(result.current.action).toBe(VaultAction.INFO)
        mocks.tokens = { HAIVELOV2: { isCollateral: true } }
        rerender()
        expect(result.current.action).toBe(VaultAction.CREATE)
        expect(mocks.actions.setVaultData).toHaveBeenLastCalledWith(
            expect.objectContaining({ collateral: 'HAIVELOV2' })
        )
    })

    it('canonicalizes the legacy haiVELO link and stops creation if v2 closes', () => {
        const { result, rerender } = renderRoute('/vaults/open?collateral=HAIVELO')
        expect(result.current.location.search).toBe('?collateral=HAIVELOV2')
        expect(result.current.action).toBe(VaultAction.CREATE)
        mocks.isOpenable.mockReturnValue(false)
        rerender()
        expect(result.current.location.pathname).toBe('/vaults')
        expect(result.current.action).toBe(VaultAction.INFO)
    })

    it('resolves an existing retired vault by ID', () => {
        const { result } = renderRoute('/vaults/manage?id=7')
        expect(result.current.action).toBe(VaultAction.DEPOSIT_BORROW)
        expect(mocks.actions.setSingleVault).toHaveBeenLastCalledWith(mocks.vaults[0])
    })

    it('leaves an unknown management ID unselected', () => {
        const { result } = renderRoute('/vaults/manage?id=999')
        expect(result.current.action).toBe(VaultAction.INFO)
        expect(mocks.actions.setSingleVault).toHaveBeenLastCalledWith(undefined)
    })
})

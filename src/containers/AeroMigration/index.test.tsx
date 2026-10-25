import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

const { getMigrationQuote, submitMigrationStep, getBaseProvider, getOptimismProvider } = vi.hoisted(() => ({
    getMigrationQuote: vi.fn(),
    submitMigrationStep: vi.fn(),
    getBaseProvider: vi.fn(),
    getOptimismProvider: vi.fn(),
}))
vi.mock('~/utils', async () => await vi.importActual('~/utils/constants'))
vi.mock('~/hooks/useEthersAdapters', () => ({ useEthersSigner: () => undefined }))
vi.mock('./BridgeForm', () => ({ BridgeForm: () => <button>Bridge new haiAERO</button> }))
vi.mock('./MintForm', () => ({ MintForm: () => <button>Mint new haiAERO</button> }))
vi.mock('~/services/hyperlane/bridgeService', () => ({ getBaseProvider, getOptimismProvider }))
vi.mock('~/services/aeroMigration/service', () => ({
    getMigrationQuote,
    submitMigrationStep,
    verifyMigrationReceipt: vi.fn(),
}))

import { darkTheme } from '~/styles/themes'
import { AeroMigrationPage } from './index'

describe('migration unavailable until adoption', () => {
    it('shows status and legacy access without any approval, mint or migration action', () => {
        render(
            <ThemeProvider theme={darkTheme}>
                <MemoryRouter>
                    <AeroMigrationPage />
                </MemoryRouter>
            </ThemeProvider>
        )
        expect(screen.getByText(/Migration to the new haiAERO is not open yet/)).not.toBeNull()
        expect(screen.getByRole('link', { name: 'Manage vaults' }).getAttribute('href')).toBe('/vaults')
        expect(screen.getByRole('link', { name: 'Manage staked LP' })).not.toBeNull()
        expect(screen.getByRole('link', { name: 'View rewards' })).not.toBeNull()
        expect(screen.queryAllByRole('button')).toHaveLength(0)
        expect(getMigrationQuote).not.toHaveBeenCalled()
        expect(submitMigrationStep).not.toHaveBeenCalled()
        expect(getBaseProvider).not.toHaveBeenCalled()
        expect(getOptimismProvider).not.toHaveBeenCalled()
    })
})

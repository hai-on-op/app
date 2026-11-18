import { render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'
import { darkTheme } from '~/styles/themes'
import { PairsBanner } from './PairsBanner'

const tokens = {
    HAIVELO: { symbol: 'HAIVELO', isCollateral: true },
    HAIVELOV2: { symbol: 'HAIVELOV2', isCollateral: true },
    KITE: { symbol: 'KITE', isCollateral: false },
}
const isOpenableCollateral = vi.fn()
vi.mock('~/store', () => ({ useStoreState: () => tokens }))
vi.mock('~/providers/AnalyticsProvider', () => ({ useAnalytics: () => ({ isOpenableCollateral }) }))

describe('landing page collateral ticker', () => {
    it('advertises eligible collateral and handles a market with no open vault types', () => {
        const banner = (
            <ThemeProvider theme={darkTheme}>
                <PairsBanner />
            </ThemeProvider>
        )
        isOpenableCollateral.mockReturnValue(false)
        const { container, rerender } = render(banner)
        expect(container.firstChild).toBeNull()

        isOpenableCollateral.mockImplementation((symbol) => symbol !== 'HAIVELO')
        rerender(
            <ThemeProvider theme={darkTheme}>
                <PairsBanner />
            </ThemeProvider>
        )
        expect(screen.getAllByText('haiVELO v2').length).toBeGreaterThan(0)
        expect(screen.queryByText('haiVELO v1')).toBeNull()
        expect(screen.queryByText('KITE')).toBeNull()
    })
})

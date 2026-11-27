import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, useHistory } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IntentionHeader } from '../IntentionHeader'
import { darkTheme } from '~/styles/themes'

vi.mock('~/hooks', () => ({ useMediaQuery: () => false }))
vi.mock('flagsmith/react', () => ({ useFlags: () => ({ hai_velo: { enabled: false } }) }))
vi.mock('~/containers/Vaults/Stats', () => ({ BorrowStats: () => <div>Borrow statistics</div> }))
vi.mock('~/containers/Earn/Stats', () => ({ EarnStats: () => <div>Earn statistics</div> }))
vi.mock('~/containers/Auctions/Stats', () => ({ AuctionStats: () => <div>Auction statistics</div> }))
vi.mock('~/containers/Stake/Stats', () => ({ StakeStats: () => <div>Stake statistics</div> }))
vi.mock('~/containers/Vaults/HaiAeroStats', () => ({ HaiAeroStats: () => <div>Legacy haiAERO APR and TVL</div> }))
vi.mock('~/containers/Vaults/HaiVeloStats', () => ({ HaiVeloStats: () => <div>Legacy haiVELO APR and TVL</div> }))
vi.mock('../WrapperAd', () => ({ WrapperAd: () => null }))
vi.mock('../BrandedSelect', () => ({
    BrandedSelect: ({ value, options }: { value: string; options: Array<{ value: string; label: string }> }) => (
        <div aria-label="Selected action">{options.find((option) => option.value === value)?.label}</div>
    ),
}))
vi.mock('~/staking/configs/kite', () => ({ kiteConfig: { namespace: 'kite', labels: { token: 'KITE' } } }))
vi.mock('~/staking/configs/haiBoldCurveLp', () => ({
    haiBoldCurveLpConfig: { namespace: 'hai-bold-curve-lp', labels: { token: 'HAI/BOLD' } },
}))
vi.mock('~/staking/configs/haiVeloVeloLp', () => ({
    haiVeloVeloLpConfig: { namespace: 'hai-velo-velo-lp', labels: { token: 'haiVELO/VELO' } },
}))

function renderRoute(path: string) {
    let history!: ReturnType<typeof useHistory>
    function RouteContent() {
        history = useHistory()
        return <IntentionHeader />
    }
    render(
        <MemoryRouter initialEntries={[path]}>
            <ThemeProvider theme={darkTheme}>
                <RouteContent />
            </ThemeProvider>
        </MemoryRouter>
    )
    return history
}

describe('haiAERO v2 page header', () => {
    afterEach(cleanup)

    it.each(['/haiAERO', '/haiAERO?tab=aero-v2', '/haiVELO?tab=aero-v2', '/vaults/manage?id=12&tab=aero-v2'])(
        'keeps legacy collateral statistics out of the new token flow at %s',
        (path) => {
            renderRoute(path)

            expect(screen.getByText(/Mint haiAERO v2 with AERO, xAERO or sAERO NFTs/)).toBeTruthy()
            expect(screen.queryByText('Legacy haiAERO APR and TVL')).toBeNull()
            expect(screen.queryByText('Legacy haiVELO APR and TVL')).toBeNull()
            expect(screen.queryByText('Borrow statistics')).toBeNull()
        }
    )

    it.each(['legacy-mint', 'legacy-bridge', 'manage', 'activity'])(
        'keeps the legacy haiAERO statistics on the %s tab',
        (tab) => {
            renderRoute(`/haiAERO?tab=${tab}`)
            expect(screen.getByText('Legacy haiAERO APR and TVL')).toBeTruthy()
            expect(screen.queryByText(/Mint haiAERO v2 with AERO, xAERO or sAERO NFTs/)).toBeNull()
        }
    )

    it('restores the legacy header when navigating back from migration', () => {
        const history = renderRoute('/haiVELO')
        expect(screen.getByText('Legacy haiVELO APR and TVL')).toBeTruthy()

        act(() => history.push('/haiVELO?tab=aero-v2'))
        expect(screen.getByText(/Mint haiAERO v2 with AERO, xAERO or sAERO NFTs/)).toBeTruthy()
        expect(screen.queryByText('Legacy haiVELO APR and TVL')).toBeNull()

        act(() => history.goBack())
        expect(screen.getByText('Legacy haiVELO APR and TVL')).toBeTruthy()
    })

    it('retains normal borrowing statistics on an unrelated collateral route', () => {
        renderRoute('/vaults/open?collateral=WETH')
        expect(screen.getByText('Borrow statistics')).toBeTruthy()
        expect(screen.queryByText(/Mint haiAERO v2 with AERO, xAERO or sAERO NFTs/)).toBeNull()
    })
})

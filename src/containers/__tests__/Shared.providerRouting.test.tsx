import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { darkTheme } from '~/styles/themes'

const { useStoreActionsMock, useStoreStateMock } = vi.hoisted(() => ({
    useStoreActionsMock: vi.fn(),
    useStoreStateMock: vi.fn(),
}))

vi.mock('@hai-on-op/sdk', () => ({
    getTokenList: () => ({
        HAI: { address: '0x0000000000000000000000000000000000000001' },
        KITE: { address: '0x0000000000000000000000000000000000000002' },
    }),
}))

vi.mock('wagmi', () => ({
    useAccount: () => ({ address: undefined }),
    useNetwork: () => ({ chain: undefined }),
}))

vi.mock('~/store', () => ({
    useStoreActions: useStoreActionsMock,
    useStoreState: useStoreStateMock,
}))

vi.mock('~/hooks', () => ({
    useTokenContract: () => null,
    useEthersSigner: () => null,
    useGeb: () => null,
    usePrevious: () => undefined,
    usePublicGeb: () => null,
}))

vi.mock('~/providers/StakingProvider', () => ({
    StakingProvider: ({ children }: { children: ReactNode }) => (
        <div data-testid="staking-provider">{children}</div>
    ),
}))

vi.mock('~/providers/ClaimsProvider', () => ({
    ClaimsProvider: ({ children }: { children: ReactNode }) => <div data-testid="claims-provider">{children}</div>,
}))

vi.mock('~/providers/RewardsProvider', () => ({
    RewardsProvider: ({ children }: { children: ReactNode }) => <div data-testid="rewards-provider">{children}</div>,
}))

vi.mock('~/providers/EarnProvider', () => ({
    EarnProvider: ({ children }: { children: ReactNode }) => <div data-testid="earn-provider">{children}</div>,
}))

vi.mock('~/services/TransactionUpdater', () => ({
    TransactionUpdater: () => null,
}))

vi.mock('../Header', () => ({
    Header: () => <div data-testid="header" />,
}))

vi.mock('~/components/ImagePreloader', () => ({
    ImagePreloader: () => null,
}))

vi.mock('~/components/BlockedAddress', () => ({
    BlockedAddress: () => <div data-testid="blocked-address" />,
}))

vi.mock('~/components/ParallaxBackground', () => ({
    ParallaxBackground: () => null,
}))

vi.mock('~/components/Modal/WaitingModal', () => ({
    WaitingModal: () => null,
}))

vi.mock('~/components/Modal/ClaimModal', () => ({
    ClaimModal: () => <div data-testid="claim-modal" />,
}))

vi.mock('~/components/Modal/StakingClaimModal', () => ({
    StakingClaimModal: () => <div data-testid="staking-claim-modal" />,
}))

vi.mock('~/components/IntentionHeader', () => ({
    IntentionHeader: ({ children }: { children?: ReactNode }) => (
        <div data-testid="intention-header">{children}</div>
    ),
}))

vi.mock('~/components/HaiAlert', () => ({
    HaiAlert: () => null,
}))

vi.mock('../Auctions/StartAuction', () => ({
    StartAuction: () => <div data-testid="start-auction" />,
}))

import { Shared } from '../Shared'

const baseState = {
    connectWalletModel: {
        forceUpdateTokens: false,
        tokensFetchedData: {},
        proxyAddress: '',
        ctHash: '',
    },
    auctionModel: {
        auctionsData: undefined,
    },
    popupsModel: {
        isClaimPopupOpen: false,
        isStakeClaimPopupOpen: false,
    },
}

const baseActions = {
    connectWalletModel: {
        fetchTokenData: vi.fn(),
        updateEthBalance: vi.fn(),
        setProtAllowance: vi.fn(),
        setCoinAllowance: vi.fn(),
        setTokensData: vi.fn(),
        fetchFiatPrice: vi.fn(),
        setProxyAddress: vi.fn(),
        setStep: vi.fn(),
        setIsWrongNetwork: vi.fn(),
    },
    popupsModel: {
        setIsClaimPopupOpen: vi.fn(),
        setIsWaitingModalOpen: vi.fn(),
        setWaitingPayload: vi.fn(),
        setIsInitializing: vi.fn(),
    },
    transactionsModel: {
        setTransactions: vi.fn(),
    },
    vaultModel: {
        fetchLiquidationData: vi.fn(),
        fetchUserVaults: vi.fn(),
    },
    auctionModel: {
        setCoinBalances: vi.fn(),
        setProtInternalBalance: vi.fn(),
        setInternalBalance: vi.fn(),
    },
}

function renderShared(path: string) {
    return render(
        <ThemeProvider theme={darkTheme}>
            <MemoryRouter initialEntries={[path]}>
                <Shared>
                    <div data-testid="shared-child" />
                </Shared>
            </MemoryRouter>
        </ThemeProvider>
    )
}

describe('Shared provider routing', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        useStoreStateMock.mockImplementation((selector: (state: typeof baseState) => unknown) => selector(baseState))
        useStoreActionsMock.mockImplementation(
            (selector: (actions: typeof baseActions) => unknown) => selector(baseActions)
        )
    })

    it('wraps the shared header in StakingProvider on the stake route', () => {
        renderShared('/stake')

        expect(within(screen.getByTestId('staking-provider')).getByTestId('intention-header')).toBeTruthy()
        expect(screen.queryByTestId('claims-provider')).toBeNull()
    })

    it('wraps the shared header in both staking and claims providers on the earn route', () => {
        renderShared('/earn')

        const stakingProvider = screen.getByTestId('staking-provider')
        const claimsProvider = within(stakingProvider).getByTestId('claims-provider')

        expect(within(claimsProvider).getByTestId('intention-header')).toBeTruthy()
    })

    it('wraps the shared header in ClaimsProvider on the auctions route', () => {
        renderShared('/auctions')

        const claimsProvider = screen.getByTestId('claims-provider')
        expect(within(claimsProvider).getByTestId('intention-header')).toBeTruthy()
        expect(within(claimsProvider).getByTestId('start-auction')).toBeTruthy()
    })

    it('wraps the shared header in staking and claims providers for haiVELO minting routes', () => {
        renderShared('/vaults/open?collateral=HAIVELOV2')

        const stakingProvider = screen.getByTestId('staking-provider')
        const claimsProvider = within(stakingProvider).getByTestId('claims-provider')

        expect(within(claimsProvider).getByTestId('intention-header')).toBeTruthy()
    })
})

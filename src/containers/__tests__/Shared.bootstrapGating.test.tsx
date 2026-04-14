import { render, waitFor } from '@testing-library/react'
import { utils } from 'ethers'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { darkTheme } from '~/styles/themes'
import { NETWORK_ID } from '~/utils'

const {
    allowanceMock,
    getProxyActionMock,
    useAccountMock,
    useEthersSignerMock,
    useGebMock,
    useNetworkMock,
    usePublicGebMock,
    useStoreActionsMock,
    useStoreStateMock,
    useTokenContractMock,
} = vi.hoisted(() => ({
    allowanceMock: vi.fn(),
    getProxyActionMock: vi.fn(),
    useAccountMock: vi.fn(),
    useEthersSignerMock: vi.fn(),
    useGebMock: vi.fn(),
    useNetworkMock: vi.fn(),
    usePublicGebMock: vi.fn(),
    useStoreActionsMock: vi.fn(),
    useStoreStateMock: vi.fn(),
    useTokenContractMock: vi.fn(),
}))

vi.mock('~/utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('~/utils')>()
    return {
        ...actual,
        timeout: () => Promise.resolve(),
    }
})

vi.mock('@hai-on-op/sdk', () => ({
    getTokenList: () => ({
        HAI: { address: '0x0000000000000000000000000000000000000001' },
        KITE: { address: '0x0000000000000000000000000000000000000002' },
    }),
}))

vi.mock('wagmi', () => ({
    useAccount: () => useAccountMock(),
    useNetwork: () => useNetworkMock(),
}))

vi.mock('~/store', () => ({
    useStoreActions: useStoreActionsMock,
    useStoreState: useStoreStateMock,
}))

vi.mock('~/hooks', () => ({
    useTokenContract: () => useTokenContractMock(),
    useEthersSigner: () => useEthersSignerMock(),
    useGeb: () => useGebMock(),
    useDocumentVisibility: () => true,
    usePrevious: () => undefined,
    usePublicGeb: () => usePublicGebMock(),
}))

vi.mock('~/providers/StakingProvider', () => ({
    StakingProvider: ({ children }: { children: ReactNode }) => <div data-testid="staking-provider">{children}</div>,
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
    IntentionHeader: ({ children }: { children?: ReactNode }) => <div data-testid="intention-header">{children}</div>,
}))

vi.mock('~/components/HaiAlert', () => ({
    HaiAlert: () => null,
}))

vi.mock('../Auctions/StartAuction', () => ({
    StartAuction: () => <div data-testid="start-auction" />,
}))

import { Shared } from '../Shared'

const tokenList = {
    HAI: { address: '0x0000000000000000000000000000000000000001' },
    KITE: { address: '0x0000000000000000000000000000000000000002' },
}

const baseState = {
    connectWalletModel: {
        forceUpdateTokens: false,
        tokensFetchedData: {
            HAI: { balanceE18: utils.parseEther('1') },
            KITE: { balanceE18: utils.parseEther('2') },
        },
        proxyAddress: '0x00000000000000000000000000000000000000aa',
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

describe('Shared bootstrap gating', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        allowanceMock.mockResolvedValue(utils.parseEther('5'))
        getProxyActionMock.mockResolvedValue({
            proxyAddress: '0x00000000000000000000000000000000000000aa',
        })
        useAccountMock.mockReturnValue({
            address: '0x00000000000000000000000000000000000000bb',
        })
        useNetworkMock.mockReturnValue({
            chain: { id: NETWORK_ID },
        })
        useEthersSignerMock.mockReturnValue({
            getBalance: vi.fn().mockResolvedValue(utils.parseEther('3')),
        })
        useGebMock.mockReturnValue({
            getProxyAction: getProxyActionMock,
            tokenList,
        })
        usePublicGebMock.mockReturnValue({
            tokenList,
        })
        useTokenContractMock.mockReturnValue({
            allowance: allowanceMock,
        })
        useStoreStateMock.mockImplementation((selector: (state: typeof baseState) => unknown) => selector(baseState))
        useStoreActionsMock.mockImplementation((selector: (actions: typeof baseActions) => unknown) =>
            selector(baseActions)
        )
    })

    it('skips market, allowance, and vault bootstrap work on analytics', async () => {
        renderShared('/analytics')

        await waitFor(() => expect(baseActions.connectWalletModel.setStep).toHaveBeenCalledWith(2))

        expect(baseActions.connectWalletModel.fetchFiatPrice).not.toHaveBeenCalled()
        expect(baseActions.vaultModel.fetchLiquidationData).not.toHaveBeenCalled()
        expect(baseActions.vaultModel.fetchUserVaults).not.toHaveBeenCalled()
        expect(baseActions.connectWalletModel.setCoinAllowance).not.toHaveBeenCalled()
        expect(baseActions.connectWalletModel.setProtAllowance).not.toHaveBeenCalled()
    })

    it('preloads earn market data and user vaults without proxy allowance fetches', async () => {
        renderShared('/earn')

        await waitFor(() => expect(baseActions.vaultModel.fetchUserVaults).toHaveBeenCalledTimes(1))

        expect(baseActions.connectWalletModel.fetchFiatPrice).toHaveBeenCalledTimes(1)
        expect(baseActions.vaultModel.fetchLiquidationData).toHaveBeenCalledTimes(1)
        expect(baseActions.connectWalletModel.setCoinAllowance).not.toHaveBeenCalled()
        expect(baseActions.connectWalletModel.setProtAllowance).not.toHaveBeenCalled()
    })

    it('fetches allowances on vault routes without doing the old global vault preload', async () => {
        renderShared('/vaults')

        await waitFor(() => expect(baseActions.connectWalletModel.setCoinAllowance).toHaveBeenCalledTimes(1))

        expect(baseActions.connectWalletModel.setProtAllowance).toHaveBeenCalledTimes(1)
        expect(baseActions.connectWalletModel.fetchFiatPrice).toHaveBeenCalledTimes(1)
        expect(baseActions.vaultModel.fetchLiquidationData).toHaveBeenCalledTimes(1)
        expect(baseActions.vaultModel.fetchUserVaults).not.toHaveBeenCalled()
    })
})

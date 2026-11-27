import { act, render, waitFor } from '@testing-library/react'
import { utils } from 'ethers'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { darkTheme } from '~/styles/themes'
import { NETWORK_ID } from '~/utils'

const {
    allowanceMock,
    getProxyAddressMock,
    useAccountMock,
    useEthersSignerMock,
    useGebMock,
    useNetworkMock,
    usePreviousMock,
    usePublicGebMock,
    useStoreActionsMock,
    useStoreStateMock,
    useTokenContractMock,
} = vi.hoisted(() => ({
    allowanceMock: vi.fn(),
    getProxyAddressMock: vi.fn(),
    useAccountMock: vi.fn(),
    useEthersSignerMock: vi.fn(),
    useGebMock: vi.fn(),
    useNetworkMock: vi.fn(),
    usePreviousMock: vi.fn(),
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
    usePrevious: () => usePreviousMock(),
    usePublicGeb: () => usePublicGebMock(),
}))

vi.mock('~/providers/StakingProvider', () => ({
    StakingProvider: ({ children }: { children: ReactNode }) => <div data-testid="staking-provider">{children}</div>,
}))

vi.mock('~/apr/AprProvider', () => ({
    AprProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
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

function sharedTree(path: string) {
    return (
        <ThemeProvider theme={darkTheme}>
            <MemoryRouter initialEntries={[path]}>
                <Shared>
                    <div data-testid="shared-child" />
                </Shared>
            </MemoryRouter>
        </ThemeProvider>
    )
}

function renderShared(path: string) {
    return render(sharedTree(path))
}

describe('Shared bootstrap gating', () => {
    afterEach(() => vi.restoreAllMocks())

    beforeEach(() => {
        vi.clearAllMocks()
        usePreviousMock.mockReturnValue(undefined)

        allowanceMock.mockResolvedValue(utils.parseEther('5'))
        getProxyAddressMock.mockResolvedValue('0x00000000000000000000000000000000000000aa')
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
            getProxyAction: getProxyAddressMock,
            tokenList,
        })
        usePublicGebMock.mockReturnValue({
            tokenList,
            contracts: { proxyFactory: { proxies: getProxyAddressMock } },
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

    it('does not reopen initialization when equivalent wallet references refresh', async () => {
        const view = renderShared('/haiAERO')
        await waitFor(() => expect(baseActions.popupsModel.setIsInitializing).toHaveBeenCalledWith(false))

        usePreviousMock.mockReturnValue(useAccountMock().address)
        useEthersSignerMock.mockReturnValue({
            getBalance: vi.fn().mockResolvedValue(utils.parseEther('3')),
        })
        useGebMock.mockReturnValue({ getProxyAction: getProxyAddressMock, tokenList })
        await act(async () => view.rerender(sharedTree('/haiAERO')))

        expect(getProxyAddressMock).toHaveBeenCalledTimes(1)
        expect(baseActions.popupsModel.setIsInitializing.mock.calls.filter(([value]) => value)).toHaveLength(1)
        expect(baseActions.transactionsModel.setTransactions).toHaveBeenCalledTimes(1)
    })

    it('does not refetch native balance for unrelated wallet state changes', async () => {
        const getBalance = useEthersSignerMock().getBalance
        const view = renderShared('/haiAERO')
        await waitFor(() => expect(baseActions.connectWalletModel.updateEthBalance).toHaveBeenCalledTimes(1))
        const nextState = {
            ...baseState,
            connectWalletModel: { ...baseState.connectWalletModel, forceUpdateTokens: false, step: 2 },
        }
        useStoreStateMock.mockImplementation((selector) => selector(nextState))
        await act(async () => view.rerender(sharedTree('/haiAERO')))

        expect(getBalance).toHaveBeenCalledTimes(1)
    })

    it('records Base native balance under Base rather than Optimism', async () => {
        useNetworkMock.mockReturnValue({ chain: { id: 8453 } })
        renderShared('/haiAERO')
        await waitFor(() =>
            expect(baseActions.connectWalletModel.updateEthBalance).toHaveBeenCalledWith({ chainId: 8453, balance: 3 })
        )
    })

    it('initializes a real network change using the Optimism public provider', async () => {
        useNetworkMock.mockReturnValue({ chain: { id: 8453 } })
        // The signer-backed SDK may still refer to Base when the network changes.
        const staleSignerLookup = vi.fn().mockRejectedValue(new Error('wrong network'))
        useGebMock.mockReturnValue({ getProxyAction: staleSignerLookup, tokenList })
        const view = renderShared('/haiAERO')
        await waitFor(() => expect(baseActions.popupsModel.setIsInitializing).toHaveBeenCalledWith(false))
        expect(getProxyAddressMock).not.toHaveBeenCalled()

        useNetworkMock.mockReturnValue({ chain: { id: NETWORK_ID } })
        await act(async () => view.rerender(sharedTree('/haiAERO')))

        expect(getProxyAddressMock).toHaveBeenCalledTimes(1)
        expect(staleSignerLookup).not.toHaveBeenCalled()
        expect(baseActions.popupsModel.setIsInitializing.mock.calls.filter(([value]) => value)).toHaveLength(2)
        expect(baseActions.connectWalletModel.setStep).toHaveBeenLastCalledWith(2)
    })

    it('does not apply a pending proxy result after wallet disconnect', async () => {
        let resolveProxy!: (address: string) => void
        getProxyAddressMock.mockReturnValue(new Promise<string>((resolve) => (resolveProxy = resolve)))
        const view = renderShared('/haiAERO')
        await waitFor(() => expect(getProxyAddressMock).toHaveBeenCalledTimes(1))

        useAccountMock.mockReturnValue({ address: undefined })
        useEthersSignerMock.mockReturnValue(undefined)
        await act(async () => view.rerender(sharedTree('/haiAERO')))
        const waitingCalls = baseActions.popupsModel.setWaitingPayload.mock.calls.length
        await act(async () => resolveProxy('0x00000000000000000000000000000000000000aa'))

        expect(baseActions.connectWalletModel.setStep).toHaveBeenLastCalledWith(0)
        expect(baseActions.connectWalletModel.setProxyAddress).not.toHaveBeenCalledWith(
            '0x00000000000000000000000000000000000000aa'
        )
        expect(baseActions.popupsModel.setWaitingPayload).toHaveBeenCalledTimes(waitingCalls)
        expect(baseActions.popupsModel.setIsInitializing).toHaveBeenLastCalledWith(false)
    })

    it('initializes a different wallet account exactly once', async () => {
        vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
        const previousAccount = useAccountMock().address
        const view = renderShared('/haiAERO')
        await waitFor(() => expect(baseActions.popupsModel.setIsInitializing).toHaveBeenCalledWith(false))
        const nextAccount = '0x00000000000000000000000000000000000000cc'
        usePreviousMock.mockReturnValue(previousAccount)
        useAccountMock.mockReturnValue({ address: nextAccount })
        await act(async () => view.rerender(sharedTree('/haiAERO')))
        usePreviousMock.mockReturnValue(nextAccount)
        await act(async () => view.rerender(sharedTree('/haiAERO')))

        expect(getProxyAddressMock).toHaveBeenLastCalledWith(nextAccount)
        expect(getProxyAddressMock).toHaveBeenCalledTimes(2)
        expect(baseActions.popupsModel.setIsInitializing.mock.calls.filter(([value]) => value)).toHaveLength(2)
    })

    it('rechecks when a pending proxy creation clears', async () => {
        let walletState = { ...baseState, connectWalletModel: { ...baseState.connectWalletModel, ctHash: '0xpending' } }
        useStoreStateMock.mockImplementation((selector) => selector(walletState))
        const view = renderShared('/haiAERO')
        await waitFor(() => expect(baseActions.popupsModel.setIsInitializing).toHaveBeenCalledWith(false))
        expect(baseActions.connectWalletModel.setStep).not.toHaveBeenCalledWith(2)

        walletState = { ...baseState, connectWalletModel: { ...baseState.connectWalletModel, ctHash: '' } }
        await act(async () => view.rerender(sharedTree('/haiAERO')))
        expect(getProxyAddressMock).toHaveBeenCalledTimes(2)
        expect(baseActions.connectWalletModel.setStep).toHaveBeenLastCalledWith(2)
    })

    it('keeps a wallet without a proxy on the create-proxy step', async () => {
        getProxyAddressMock.mockResolvedValue('0x0000000000000000000000000000000000000000')
        renderShared('/haiAERO')
        await waitFor(() => expect(baseActions.popupsModel.setIsInitializing).toHaveBeenCalledWith(false))
        expect(baseActions.connectWalletModel.setStep).toHaveBeenLastCalledWith(1)
    })
})

import { type EasyPeasyConfig, type Store, createStore } from 'easy-peasy'
import { type ConnectWalletModel, connectWalletModel } from './connectWalletModel'
import { fetchTokenData, type Geb, type TokenFetchData } from '@hai-on-op/sdk'
import { vi } from 'vitest'
vi.mock('@hai-on-op/sdk', async () => ({
    ...(await vi.importActual<typeof import('@hai-on-op/sdk')>('@hai-on-op/sdk')),
    fetchTokenData: vi.fn(),
}))

describe('connect wallet model', () => {
    let store: Store<ConnectWalletModel, EasyPeasyConfig<{}, any>>
    beforeEach(() => {
        store = createStore(connectWalletModel)
    })

    it('discards a previous wallet token lookup after switching owners', async () => {
        const actions = store.getActions()
        actions.setBalanceOwner('walletA')
        let finish!: (value: Record<string, TokenFetchData>) => void
        vi.mocked(fetchTokenData).mockImplementationOnce(
            () =>
                new Promise<Record<string, TokenFetchData>>((resolve) => {
                    finish = resolve
                })
        )
        const read = actions.fetchTokenData({ user: 'walletA', geb: { tokenList: {} } as Geb })
        actions.updateEthBalance({ chainId: 8453, balance: '1.1' })
        actions.setBalanceOwner('walletB')
        finish({ HAI: {} as TokenFetchData })
        await read
        expect(store.getState().tokensFetchedData).toEqual({})
        expect(store.getState().ethBalance).toEqual({})
        expect(store.getState().forceUpdateTokens).toBe(true)
    })

    describe('setsBlockNumber', () => {
        it('sets block number', () => {
            store.getActions().updateBlockNumber({ chainId: 10, blockNumber: 123 })
            expect(store.getState().blockNumber).toEqual({ 10: 123 })
        })
    })

    describe('setsEthBalance', () => {
        it('sets ethBalance', () => {
            store.getActions().updateEthBalance({ chainId: 10, balance: 123 })
            expect(store.getState().ethBalance).toEqual({
                1: '0',
                10: 123,
                420: '0',
            })
        })
    })

    describe('setsEthBalance', () => {
        it('sets haiBalance for mainnet', () => {
            store.getActions().updateEthBalance({ chainId: 1, balance: 123 })
            expect(store.getState().ethBalance).toEqual({
                1: 123,
                10: '0',
                420: '0',
            })
        })

        it('sets haiBalance for rinkeby', () => {
            store.getActions().updateEthBalance({ chainId: 4, balance: 123 })
            expect(store.getState().ethBalance).toEqual({
                1: '0',
                10: '0',
                4: 123,
                420: '0',
            })
        })
    })
})

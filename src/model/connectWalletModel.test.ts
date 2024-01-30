import { type EasyPeasyConfig, type Store, createStore } from 'easy-peasy'
import { type ConnectWalletModel, connectWalletModel } from './connectWalletModel'

describe('connect wallet model', () => {
    let store: Store<ConnectWalletModel, EasyPeasyConfig<{}, any>>
    beforeEach(() => {
        store = createStore(connectWalletModel)
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

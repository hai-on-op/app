import { createStore, EasyPeasyConfig, Store } from 'easy-peasy'
import { type PopupsModel, popupsModel } from './popupsModel'

describe('popups model', () => {
    let store: Store<PopupsModel, EasyPeasyConfig<{}, any>>
    beforeEach(() => {
        store = createStore(popupsModel)
    })

    describe('waitingModal', () => {
        it('opens the waiting modal', () => {
            expect(store.getState().isWaitingModalOpen).toBe(false)
            store.getActions().setIsWaitingModalOpen(true)
            expect(store.getState().isWaitingModalOpen).toBe(true)
        })
    })
})

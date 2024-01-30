import { createStore, EasyPeasyConfig, Store } from 'easy-peasy'
import { type AuctionModel, auctionModel } from './auctionModel'

describe('popups model', () => {
    let store: Store<AuctionModel, EasyPeasyConfig<{}, any>>
    beforeEach(() => {
        store = createStore(auctionModel)
    })

    describe('isSubmitting', () => {
        it('activates isSubmitting', () => {
            expect(store.getState().isSubmitting).toBe(false)
            store.getActions().setIsSubmitting(true)
            expect(store.getState().isSubmitting).toBe(true)
        })
    })
})

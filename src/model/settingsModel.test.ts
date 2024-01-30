import { createStore, EasyPeasyConfig, Store } from 'easy-peasy'
import { type SettingsModel, settingsModel } from './settingsModel'

describe('settings model', () => {
    let store: Store<SettingsModel, EasyPeasyConfig<{}, any>>
    beforeEach(() => {
        store = createStore(settingsModel)
    })

    describe('setsIsMusicPlaying', () => {
        it('plays music', () => {
            store.getActions().setIsPlayingMusic(false)
            expect(store.getState().isPlayingMusic).toBe(false)
            store.getActions().setIsPlayingMusic(true)
            expect(store.getState().isPlayingMusic).toBe(true)
        })
    })

    // describe('setsBodyOverflow', () => {
    //     it('sets body overflow', () => {
    //         expect(store.getState().bodyOverflow).toBe(false)
    //         store.getActions().setBodyOverFlow(true)
    //         expect(store.getState().bodyOverflow).toBe(true)
    //     })
    // })

    // describe('BlocksBody', () => {
    //     it('blocks body', () => {
    //         expect(store.getState().blockBody).toBe(false)
    //         store.getActions().setBlockBody(true)
    //         expect(store.getState().blockBody).toBe(true)
    //     })
    // })
})

import { createStore, EasyPeasyConfig, Store } from 'easy-peasy'
import { beforeEach, describe, expect, it } from 'vitest'
import { getInitialIsPlayingMusic, type SettingsModel, settingsModel } from './settingsModel'

describe('settings model', () => {
    let store: Store<SettingsModel, EasyPeasyConfig<{}, any>>
    beforeEach(() => {
        localStorage.clear()
        store = createStore(settingsModel)
    })

    describe('getInitialIsPlayingMusic', () => {
        it('defaults to disabled until the user explicitly enables music', () => {
            expect(getInitialIsPlayingMusic()).toBe(false)
        })

        it('does not restore enabled music from persisted state on boot', () => {
            localStorage.setItem('musicDisabled', 'false')

            expect(getInitialIsPlayingMusic()).toBe(false)
        })
    })

    describe('setsIsMusicPlaying', () => {
        it('plays music', () => {
            store.getActions().setIsPlayingMusic(false)
            expect(store.getState().isPlayingMusic).toBe(false)
            expect(localStorage.getItem('musicDisabled')).toBe('true')
            store.getActions().setIsPlayingMusic(true)
            expect(store.getState().isPlayingMusic).toBe(true)
            expect(localStorage.getItem('musicDisabled')).toBe('false')
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

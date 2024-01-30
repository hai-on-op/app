import { type Action, action } from 'easy-peasy'

const language = localStorage.getItem('lang')
const isLight = localStorage.getItem('isLight')
const shouldPlayMusic = !localStorage.getItem('musicDisabled')
// const local_blockchain_connection = localStorage.getItem(
//     'blockchain_connection'
// )

export interface SettingsModel {
    isLightTheme: boolean
    setIsLightTheme: Action<SettingsModel, boolean>

    lang: string
    setLang: Action<SettingsModel, string>

    // bodyOverflow: boolean
    // setBodyOverFlow: Action<SettingsModel, boolean>
    // blockBody: boolean
    // setBlockBody: Action<SettingsModel, boolean>
    headerBgActive: boolean
    setHeaderBgActive: Action<SettingsModel, boolean>

    isPlayingMusic: boolean
    setIsPlayingMusic: Action<SettingsModel, boolean>
}

export const settingsModel: SettingsModel = {
    isLightTheme: isLight ? JSON.parse(isLight) : true,
    setIsLightTheme: action((state, payload) => {
        state.isLightTheme = payload
        localStorage.setItem('isLight', JSON.stringify(payload))
    }),

    lang: language || 'en',
    setLang: action((state, payload) => {
        state.lang = payload
        localStorage.setItem('lang', payload)
    }),

    // bodyOverflow: false,
    // setBodyOverFlow: action((state, payload) => {
    //     state.bodyOverflow = payload
    // }),
    // blockBody: false,
    // setBlockBody: action((state, payload) => {
    //     state.blockBody = payload
    // }),
    headerBgActive: false,
    setHeaderBgActive: action((state, payload) => {
        state.headerBgActive = payload
    }),

    isPlayingMusic: shouldPlayMusic,
    setIsPlayingMusic: action((state, payload) => {
        state.isPlayingMusic = payload
        localStorage.setItem('musicDisabled', payload.toString())
    }),
}

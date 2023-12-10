import { action, Action } from 'easy-peasy'

const language = localStorage.getItem('lang')
const isLight = localStorage.getItem('isLight')
const shouldPlayMusic = !localStorage.getItem('musicDisabled')

export interface SettingsModel {
    isLightTheme: boolean
    lang: string
    bodyOverflow: boolean
    blockBody: boolean
    isPlayingMusic: boolean
    setIsLightTheme: Action<SettingsModel, boolean>
    setLang: Action<SettingsModel, string>
    setBodyOverFlow: Action<SettingsModel, boolean>
    setBlockBody: Action<SettingsModel, boolean>
    setIsPlayingMusic: Action<SettingsModel, boolean>
}
// const local_blockchain_connection = localStorage.getItem(
//     'blockchain_connection'
// )

const settingsModel: SettingsModel = {
    isLightTheme: isLight ? JSON.parse(isLight) : true,
    lang: language || 'en',
    bodyOverflow: false,
    blockBody: false,
    isPlayingMusic: shouldPlayMusic,
    setIsLightTheme: action((state, payload) => {
        state.isLightTheme = payload
        localStorage.setItem('isLight', JSON.stringify(payload))
    }),
    setLang: action((state, payload) => {
        state.lang = payload
        localStorage.setItem('lang', payload)
    }),
    setBodyOverFlow: action((state, payload) => {
        state.bodyOverflow = payload
    }),
    setBlockBody: action((state, payload) => {
        state.blockBody = payload
    }),
    setIsPlayingMusic: action((state, payload) => {
        state.isPlayingMusic = payload
        localStorage.setItem('musicDisabled', payload.toString())
    }),
}

export default settingsModel

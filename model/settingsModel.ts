import { action, Action } from 'easy-peasy'

const language = typeof window !== 'undefined' && localStorage.getItem('lang') || null
const isLight = typeof window !== 'undefined' && localStorage.getItem('isLight') || null

export interface SettingsModel {
    isLightTheme: boolean
    lang: string
    bodyOverflow: boolean
    blockBody: boolean
    setIsLightTheme: Action<SettingsModel, boolean>
    setLang: Action<SettingsModel, string>
    setBodyOverFlow: Action<SettingsModel, boolean>
    setBlockBody: Action<SettingsModel, boolean>
}
// const local_blockchain_connection = localStorage.getItem(
//     'blockchain_connection'
// )

const settingsModel: SettingsModel = {
    isLightTheme: isLight ? JSON.parse(isLight) : true,
    lang: language || 'en',
    bodyOverflow: false,
    blockBody: false,
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
}

export default settingsModel

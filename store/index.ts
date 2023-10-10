import { useMemo } from 'react'
import { createStore, createTypedHooks, persist, Store } from 'easy-peasy'
import model, { StoreModel } from '@/model'
import { initI18n } from '@/utils/i18n'

let store: Store<StoreModel> | undefined

const typedHooks = createTypedHooks<StoreModel>()

export const useStoreActions = typedHooks.useStoreActions
export const useStoreDispatch = typedHooks.useStoreDispatch
export const useStoreState = typedHooks.useStoreState

const initialState = { ...model }

function initStore(preloadedState = initialState) {
    const initializedStore = createStore(
        persist(model),
        { initialState: preloadedState }
    )
    initI18n(initializedStore.getState().settingsModel.lang)
    return initializedStore
}

export const initializeStore = (preloadedState?: StoreModel) => {
    let _store = store ?? initStore(preloadedState)

    // After navigating to a page with an initial Redux state, merge that state
    // with the current state in the store, and create a new store
    if (preloadedState && store) {
        _store = initStore({
            ...store.getState(),
            ...preloadedState,
        })
        // Reset the current store
        store = undefined
    }

    // For SSG and SSR always create a new store
    if (typeof window === 'undefined') return _store
    // Create the store once in the client
    if (!store) store = _store

    return _store
}

export function useStore(initialState?: StoreModel) {
    const store = useMemo(() => initializeStore(initialState), [initialState])
    return store
}

export default store
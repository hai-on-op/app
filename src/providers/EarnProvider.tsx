import { createContext, useContext } from 'react'

import type { ReactChildren } from '~/types'
import { useEarnStrategies } from '~/hooks/useEarnStrategies'

type EarnContextValue = ReturnType<typeof useEarnStrategies>

const EarnContext = createContext<EarnContextValue | null>(null)

type Props = {
    children: ReactChildren
}

export function EarnProvider({ children }: Props) {
    const value = useEarnStrategies()

    return <EarnContext.Provider value={value}>{children}</EarnContext.Provider>
}

export function useEarnContext() {
    const context = useContext(EarnContext)

    if (!context) {
        throw new Error('useEarnContext must be used within an EarnProvider')
    }

    return context
}

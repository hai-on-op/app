import React, { createContext, useContext } from 'react'
import type { AprContextValue } from './types'
import { useAprEngine } from './useAprEngine'

const AprContext = createContext<AprContextValue | undefined>(undefined)

export function AprProvider({ children }: { children: React.ReactNode }) {
    const value = useAprEngine()
    return <AprContext.Provider value={value}>{children}</AprContext.Provider>
}

/**
 * Primary hook to access APR data for all strategies.
 *
 * Usage:
 *   const { getStrategy, getEffectiveApr, getBoost } = useApr()
 *   const haiVelo = getStrategy('haivelo-deposit')
 *   const apr = getEffectiveApr('kite-staking')
 */
export function useApr(): AprContextValue {
    const ctx = useContext(AprContext)
    if (!ctx) {
        throw new Error('useApr must be used within AprProvider')
    }
    return ctx
}

/**
 * Convenience hook to get a single strategy's APR data.
 */
export function useStrategyApr(strategyId: string) {
    const { getStrategy, loading } = useApr()
    return { strategy: getStrategy(strategyId), loading }
}

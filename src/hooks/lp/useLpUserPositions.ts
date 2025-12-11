import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { UserPosition } from './useLpUserPositionsMap'
import { useLpAllPositions } from './useLpAllPositions'

export function useLpUserPositions(address?: string) {
    const { data, isLoading, isError, error } = useLpAllPositions()

    const lower = address?.toLowerCase() || ''
    const filtered = useMemo<UserPosition[] | null>(() => {
        if (!data || !lower) return null
        return data.filter((p) => p.owner.toLowerCase() === lower)
    }, [data, lower])

    // Provide a query-like interface for API parity
    return {
        data: filtered,
        isLoading,
        isError,
        error,
    }
}



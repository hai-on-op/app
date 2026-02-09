/**
 * useMinterBoostApr Hook
 *
 * Calculates boost APR for a minter protocol based on user's stake and deposits.
 * Generalized from useHaiVeloBoostApr to support multiple protocols.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MinterProtocolId, MinterBoostAprData } from '~/types/minterProtocol'
import {
    getProtocolConfig,
    calculateCollateralMapping,
    calculateBoostMap,
    computeBoostApr,
    fetchLatestTransferAmount,
} from '~/services/minterProtocol'
import { fetchV1Safes, fetchV2Safes, getLastEpochTotals } from '~/services/minterProtocol/dataSources'

const FIVE_MINUTES_MS = 5 * 60 * 1000

interface UseMinterBoostAprParams {
    protocolId: MinterProtocolId
    userAddress?: string
    protocolTokenPrice: number
    rewardTokenPrice: number
    usersStakingData: Record<string, { stakedBalance: string | number } | undefined>
    totalStakedAmount: number
    useTestnet?: boolean
}

interface UseMinterBoostAprResult {
    data: MinterBoostAprData | null
    isLoading: boolean
    isError: boolean
    error: unknown
}

/**
 * Hook to calculate boost APR for a minter protocol.
 *
 * @param params - Parameters for the hook
 * @returns Boost APR data and loading/error state
 */
export function useMinterBoostApr(params: UseMinterBoostAprParams): UseMinterBoostAprResult {
    const {
        protocolId,
        userAddress,
        protocolTokenPrice,
        rewardTokenPrice,
        usersStakingData,
        totalStakedAmount,
        useTestnet = false,
    } = params

    const config = getProtocolConfig(protocolId, useTestnet)

    // Fetch collateral mapping data
    const { data: mappingData, isLoading: mappingLoading, isError: mappingError, error: mappingErr } = useQuery({
        queryKey: ['minter', protocolId, 'collateralMapping'],
        queryFn: async () => {
            const [v1Data, v2Data] = await Promise.all([
                fetchV1Safes(config),
                fetchV2Safes(config),
            ])

            // Combine V1 and V2 safes
            const allSafes = [...(v1Data.safes || []), ...(v2Data.safes || [])]
            const mapping = calculateCollateralMapping({ safes: allSafes })
            const totalDeposited = Number(v1Data.totalCollateral || '0') + Number(v2Data.totalCollateral || '0')

            return { mapping, totalDeposited }
        },
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })

    // Fetch reward data
    const { data: rewardData, isLoading: rewardLoading, isError: rewardError, error: rewardErr } = useQuery({
        queryKey: ['minter', protocolId, 'rewardTransfer'],
        queryFn: async () => {
            // Get HAI token address from store (placeholder - would need to be passed in)
            // For now, we'll use a known address or fetch from config
            const haiTokenAddress = '0x10398AbC267496E49106B07dd6BE13364D10dC71' // HAI on Optimism

            const amount = await fetchLatestTransferAmount({
                config,
                haiTokenAddress,
            })

            return amount
        },
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
        enabled: config.features.supportsBoost,
    })

    // Calculate boost APR
    const result = useMemo<UseMinterBoostAprResult>(() => {
        const isLoading = mappingLoading || rewardLoading
        const isError = mappingError || rewardError
        const error = mappingErr || rewardErr

        if (!mappingData || rewardData === undefined) {
            return { data: null, isLoading, isError, error }
        }

        const { mapping, totalDeposited } = mappingData
        const latestTransferAmount = rewardData || 0

        // Calculate boost map
        const boostMap = calculateBoostMap(
            mapping,
            usersStakingData,
            totalStakedAmount,
            totalDeposited
        )

        // Compute APR
        const aprData = computeBoostApr({
            mapping,
            boostMap,
            protocolTokenPrice,
            rewardTokenPrice,
            latestTransferAmount,
            userAddress,
        })

        return {
            data: aprData,
            isLoading,
            isError,
            error,
        }
    }, [
        mappingData,
        rewardData,
        mappingLoading,
        rewardLoading,
        mappingError,
        rewardError,
        mappingErr,
        rewardErr,
        usersStakingData,
        totalStakedAmount,
        protocolTokenPrice,
        rewardTokenPrice,
        userAddress,
    ])

    return result
}

/**
 * Hook to get collateral mapping for a minter protocol.
 * Useful for components that need to display per-user data.
 */
export function useMinterCollateralMapping(
    protocolId: MinterProtocolId,
    useTestnet = false
): {
    mapping: Record<string, string>
    totalDeposited: number
    isLoading: boolean
    isError: boolean
} {
    const config = getProtocolConfig(protocolId, useTestnet)

    const { data, isLoading, isError } = useQuery({
        queryKey: ['minter', protocolId, 'collateralMapping'],
        queryFn: async () => {
            const [v1Data, v2Data] = await Promise.all([
                fetchV1Safes(config),
                fetchV2Safes(config),
            ])

            const allSafes = [...(v1Data.safes || []), ...(v2Data.safes || [])]
            const mapping = calculateCollateralMapping({ safes: allSafes })
            const totalDeposited = Number(v1Data.totalCollateral || '0') + Number(v2Data.totalCollateral || '0')

            return { mapping, totalDeposited }
        },
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })

    return {
        mapping: data?.mapping || {},
        totalDeposited: data?.totalDeposited || 0,
        isLoading,
        isError,
    }
}

/**
 * Hook to get last epoch totals for APR calculations.
 */
export function useMinterLastEpochTotals(
    protocolId: MinterProtocolId,
    useTestnet = false
): {
    v1Total: number
    v2Total: number
    blockNumber: number | null
    isLoading: boolean
    isError: boolean
} {
    const config = getProtocolConfig(protocolId, useTestnet)

    const { data, isLoading, isError } = useQuery({
        queryKey: ['minter', protocolId, 'lastEpochTotals'],
        queryFn: async () => {
            const totals = await getLastEpochTotals(config)
            return totals
        },
        staleTime: FIVE_MINUTES_MS,
        refetchInterval: FIVE_MINUTES_MS,
    })

    return {
        v1Total: data?.v1Total || 0,
        v2Total: data?.v2Total || 0,
        blockNumber: data?.blockNumber || null,
        isLoading,
        isError,
    }
}


import { useState, useEffect, useMemo } from 'react'
import { underlyingAPRService, type UnderlyingAPRResult, type UnderlyingAPRData } from '~/services/underlyingAPRService'
import { useStoreState } from '~/store'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { getLastEpochHaiVeloTotals } from '~/services/haivelo/dataSources'
import { VITE_MAINNET_PUBLIC_RPC } from '~/utils'
import { useEarnData } from '~/hooks/useEarnData'

interface UseUnderlyingAPRProps {
    collateralType: string
    enabled?: boolean
}

interface UseUnderlyingAPRResult {
    underlyingAPR: number
    isLoading: boolean
    error?: string
    breakdown?: UnderlyingAPRResult['breakdown']
    lastUpdated?: Date
    refresh: () => void
}

export function useUnderlyingAPR({ collateralType, enabled = true }: UseUnderlyingAPRProps): UseUnderlyingAPRResult {
    const [result, setResult] = useState<UnderlyingAPRResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    // Get relevant data from store that might be needed for calculations
    const {
        vaultModel: { liquidationData },
        connectWalletModel: { tokensData },
    } = useStoreState((state) => state)

    // Get Velodrome price data
    const { prices: velodromePricesData } = useVelodromePrices()

    // Get strategy data (includes HAI VELO boost APR with correct TVL)
    const { strategyData } = useEarnData()

    const isHaiVelo = collateralType === 'HAIVELO' || collateralType === 'HAIVELOV2' || collateralType === 'HAIVELO_V2'

    // Prepare data that might be needed for APR calculations
    const aprData = useMemo((): Partial<UnderlyingAPRData> => {
        if (!liquidationData || !tokensData) return {}

        const collateralLiquidationData = liquidationData.collateralLiquidationData?.[collateralType]
        const tokenData = Object.values(tokensData).find((token) => token.symbol === collateralType)

        // For HAI VELO (v1/v2), we need HAI price and the actual strategy data
        const haiPrice = Number(velodromePricesData?.HAI?.raw || 1)
        // Only pass the specific values we need to avoid dependency issues

        // const haiVeloBoostApr = isHaiVelo ? strategyData?.haiVelo?.boostApr : undefined

        return {
            collateralType,
            price: collateralLiquidationData?.currentPrice?.value,
            totalValueLocked: undefined, // Will be filled by specific calculators if needed
            // Add more data sources as needed for specific calculators
            externalProtocolData: {
                liquidationData: collateralLiquidationData,
                tokenData,
                haiPrice,
                // Only pass the specific values we need to avoid dependency issues
                haiVeloBoostApr: isHaiVelo ? strategyData?.haiVelo?.boostApr : undefined,
            },
        }
    }, [
        isHaiVelo,
        strategyData?.haiVelo?.boostApr,
        collateralType,
        liquidationData,
        tokensData,
        velodromePricesData?.HAI?.raw,
        // For HAIVELO v1/v2, depend on a stringified version of the boost data to avoid object reference issues
    ])

    // Fetch underlying APR
    useEffect(() => {
        if (!enabled || !collateralType) return

        let isCancelled = false
        setIsLoading(true)

        const fetchAPR = async () => {
            try {
                // Enrich with last-epoch TVL for haiVELO types to avoid service-side fetching
                let enriched = aprData
                const isHaiVelo =
                    collateralType === 'HAIVELO' || collateralType === 'HAIVELOV2' || collateralType === 'HAIVELO_V2'
                if (isHaiVelo) {
                    const haiVeloPrice = aprData?.price ? Number(aprData.price) : 0
                    const totals = await getLastEpochHaiVeloTotals(VITE_MAINNET_PUBLIC_RPC)
                    const lastEpochTvlUsd = totals
                        ? (Number(totals.v1Total || 0) + Number(totals.v2Total || 0)) * (haiVeloPrice || 0)
                        : undefined
                    enriched = {
                        ...aprData,
                        externalProtocolData: {
                            ...(aprData.externalProtocolData || {}),
                            lastEpochHaiVeloTvlUsd: lastEpochTvlUsd ?? undefined,
                        },
                    }
                }

                const aprResult = await underlyingAPRService.getUnderlyingAPR(collateralType, enriched)

                if (!isCancelled) {
                    setResult(aprResult)
                }
            } catch (error) {
                if (!isCancelled) {
                    setResult({
                        collateralType,
                        underlyingAPR: 0,
                        lastUpdated: new Date(),
                        error: error instanceof Error ? error.message : 'Failed to fetch underlying APR',
                    })
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false)
                }
            }
        }

        fetchAPR()

        return () => {
            isCancelled = true
        }
    }, [collateralType, enabled, refreshTrigger, aprData])

    const refresh = () => {
        underlyingAPRService.clearCache(collateralType)
        setRefreshTrigger((prev) => prev + 1)
    }

    return {
        underlyingAPR: result?.underlyingAPR ?? 0,
        isLoading,
        error: result?.error,
        breakdown: result?.breakdown,
        lastUpdated: result?.lastUpdated,
        refresh,
    }
}

// Hook for multiple vault types (useful for tables)
interface UseMultipleUnderlyingAPRProps {
    collateralTypes: string[]
    enabled?: boolean
}

interface UseMultipleUnderlyingAPRResult {
    aprs: Record<string, number>
    isLoading: boolean
    errors: Record<string, string>
    refresh: () => void
}

export function useMultipleUnderlyingAPR({
    collateralTypes,
    enabled = true,
}: UseMultipleUnderlyingAPRProps): UseMultipleUnderlyingAPRResult {
    const [results, setResults] = useState<Record<string, UnderlyingAPRResult>>({})
    const [isLoading, setIsLoading] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const {
        vaultModel: { liquidationData },
        connectWalletModel: { tokensData },
    } = useStoreState((state) => state)

    useEffect(() => {
        if (!enabled || !collateralTypes.length) return

        let isCancelled = false
        setIsLoading(true)

        const fetchAPRs = async () => {
            try {
                // Prepare data for each collateral type
                const dataMap: Record<string, Partial<UnderlyingAPRData>> = {}

                collateralTypes.forEach((type) => {
                    const collateralLiquidationData = liquidationData?.collateralLiquidationData?.[type]
                    const tokenData = Object.values(tokensData || {}).find((token) => token.symbol === type)

                    dataMap[type] = {
                        collateralType: type,
                        price: collateralLiquidationData?.currentPrice?.value,
                        totalValueLocked: undefined, // Will be filled by specific calculators if needed
                        externalProtocolData: {
                            liquidationData: collateralLiquidationData,
                            tokenData,
                        },
                    }
                })

                const aprResults = await underlyingAPRService.getAllUnderlyingAPRs(collateralTypes, dataMap)

                if (!isCancelled) {
                    const resultsMap = aprResults.reduce(
                        (acc, result) => {
                            acc[result.collateralType] = result
                            return acc
                        },
                        {} as Record<string, UnderlyingAPRResult>
                    )

                    setResults(resultsMap)
                }
            } catch (error) {
                if (!isCancelled) {
                    // Set error results for all types
                    const errorResults = collateralTypes.reduce(
                        (acc, type) => {
                            acc[type] = {
                                collateralType: type,
                                underlyingAPR: 0,
                                lastUpdated: new Date(),
                                error: error instanceof Error ? error.message : 'Failed to fetch underlying APR',
                            }
                            return acc
                        },
                        {} as Record<string, UnderlyingAPRResult>
                    )

                    setResults(errorResults)
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false)
                }
            }
        }

        fetchAPRs()

        return () => {
            isCancelled = true
        }
    }, [collateralTypes, enabled, refreshTrigger, liquidationData, tokensData])

    const refresh = () => {
        underlyingAPRService.clearCache()
        setRefreshTrigger((prev) => prev + 1)
    }

    return {
        aprs: Object.entries(results).reduce(
            (acc, [type, result]) => {
                acc[type] = result.underlyingAPR
                return acc
            },
            {} as Record<string, number>
        ),
        isLoading,
        errors: Object.entries(results).reduce(
            (acc, [type, result]) => {
                if (result.error) {
                    acc[type] = result.error
                }
                return acc
            },
            {} as Record<string, string>
        ),
        refresh,
    }
}

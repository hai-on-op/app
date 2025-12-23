import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatUnits } from 'ethers/lib/utils'
import type { StakingConfig } from '~/types/stakingConfig'
import {
    buildLpTvlService,
    formatLpTvlUsd,
    type LpTvlHookResult,
    type LpTvlValue,
} from '~/services/lpTvl'
import { useVelodrome } from '~/hooks/useVelodrome'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useLpTokenTotalSupply } from '~/hooks/useLpTokenTotalSupply'

export function useLpTvl(config?: StakingConfig): LpTvlHookResult {
    const hasTvlConfig = Boolean(config?.tvl)
    const isVelodrome = config?.tvl?.source === 'velodrome'

    // Velodrome data sources (Sugar + price oracle)
    const { data: velodromePools, loading: poolsLoading } = useVelodrome()
    const { prices: veloPrices, loading: veloPricesLoading } = useVelodromePrices()

    // Fetch actual totalSupply from the LP token contract (more reliable than Sugar's liquidity field)
    const { data: lpTotalSupply, loading: totalSupplyLoading } = useLpTokenTotalSupply(
        isVelodrome ? config?.tvl?.poolAddress : undefined
    )

    // Get VELO price for LP value calculation (haiVELO price is derived from pool ratio)
    const veloPrice = Number(veloPrices?.VELO?.raw || 0)

    const velodromePool = useMemo(() => {
        if (!config?.tvl?.poolAddress || !velodromePools?.length) return undefined
        const target = config.tvl.poolAddress.toLowerCase()
        return velodromePools.find((p) => p.address.toLowerCase() === target)
    }, [config?.tvl?.poolAddress, velodromePools])

    // Calculate Velodrome LP value using actual totalSupply from contract
    const velodromeLpValue = useMemo(() => {
        if (!isVelodrome || !velodromePool || veloPrice <= 0) return null

        const decimals = velodromePool.decimals || 18
        const haiVeloReserve = Number(formatUnits(velodromePool.reserve0 || '0', decimals))
        const veloReserve = Number(formatUnits(velodromePool.reserve1 || '0', decimals))

        // Derive haiVELO price from pool ratio: haiVELO price = (VELO reserve × VELO price) / haiVELO reserve
        const haiVeloPrice = haiVeloReserve > 0
            ? (veloReserve * veloPrice) / haiVeloReserve
            : veloPrice

        // Calculate TVL using derived haiVELO price
        // TVL = (haiVELO reserve × haiVELO price) + (VELO reserve × VELO price)
        const tvlUsd = (haiVeloReserve * haiVeloPrice) + (veloReserve * veloPrice)

        // Use actual totalSupply from contract if available, otherwise fall back to pool.liquidity
        const totalSupply = lpTotalSupply?.formatted
            ?? Number(formatUnits(velodromePool.liquidity || '0', decimals))

        const lpPriceUsd = totalSupply > 0 ? tvlUsd / totalSupply : 0

        console.log(`[useLpTvl] ====== VELODROME LP CALCULATION ======`)
        console.log(`[useLpTvl] haiVELO Reserve: ${haiVeloReserve.toFixed(4)}`)
        console.log(`[useLpTvl] VELO Reserve: ${veloReserve.toFixed(4)}`)
        console.log(`[useLpTvl] VELO Price: $${veloPrice.toFixed(4)}`)
        console.log(`[useLpTvl] haiVELO Price (derived): $${haiVeloPrice.toFixed(4)}`)
        console.log(`[useLpTvl] Pool TVL: $${tvlUsd.toFixed(2)}`)
        console.log(`[useLpTvl] Total LP Supply (from contract): ${lpTotalSupply?.formatted?.toFixed(4) ?? 'N/A'}`)
        console.log(`[useLpTvl] Total LP Supply (from Sugar): ${Number(formatUnits(velodromePool.liquidity || '0', decimals)).toFixed(4)}`)
        console.log(`[useLpTvl] LP Price: $${lpPriceUsd.toFixed(6)}`)
        console.log(`[useLpTvl] ========================================`)

        return { tvlUsd, lpPriceUsd }
    }, [isVelodrome, velodromePool, veloPrice, lpTotalSupply])

    const velodromeTvlUsd = velodromeLpValue?.tvlUsd ?? null
    const velodromeLpPriceUsd = velodromeLpValue?.lpPriceUsd ?? null

    const velodromeLoading = isVelodrome && hasTvlConfig && (poolsLoading || veloPricesLoading || totalSupplyLoading)

    // Default (non‑Velodrome) TVL source – currently placeholder, suitable for Curve or others later.
    const { data, isLoading } = useQuery<LpTvlValue | null>({
        queryKey: ['stake', config?.namespace, 'lpTvl'],
        enabled: hasTvlConfig && !isVelodrome,
        queryFn: async () => {
            if (!config) return null

            const service = buildLpTvlService(config)
            if (!service) return null

            return service.getTvl()
        },
        staleTime: 60_000,
    })

    const serviceTvlUsd = data?.usd ?? null
    const serviceLpPriceUsd = data?.lpPriceUsd ?? null
    const tvlUsd = isVelodrome ? velodromeTvlUsd : serviceTvlUsd
    const lpPriceUsd = isVelodrome ? velodromeLpPriceUsd : serviceLpPriceUsd
    const loading = isVelodrome ? velodromeLoading : isLoading && hasTvlConfig
    const tvlUsdFormatted = formatLpTvlUsd(tvlUsd)

    return {
        loading,
        tvlUsd,
        tvlUsdFormatted,
        lpPriceUsd,
    }
}

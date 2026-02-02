import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatUnits, parseUnits } from 'ethers/lib/utils'

import { useContract } from '~/hooks/useContract'
import { VELO_TOKEN_ADDRESS, HAI_VELO_V2_TOKEN_ADDRESS } from '~/services/haiVeloService'
import { haiVeloVeloLpConfig } from '~/staking/configs/haiVeloVeloLp'

/** Minimum discount threshold to consider meaningful (0.5%) */
const DISCOUNT_THRESHOLD_PERCENT = 0.5

/** Amount to quote for price calculation (1 VELO) */
const QUOTE_AMOUNT = parseUnits('1', 18)

/** ABI for Velodrome pool getAmountOut function */
const POOL_ABI = ['function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256)']

export type HaiVeloPoolDiscountResult = {
    /** True while pool data is loading */
    loading: boolean
    /** True if there's a meaningful discount available on the market */
    hasDiscount: boolean
    /** Discount percentage (e.g., 5.2 means 5.2% discount) */
    discountPercent: number
    /** Market rate: how much haiVELO you get per VELO (e.g., 1.05 means 1 VELO = 1.05 haiVELO) */
    marketRate: number
    /** Velodrome swap URL to buy haiVELO with VELO */
    swapLink: string
}

/**
 * Hook to calculate if haiVELO can be bought at a discount on Velodrome
 * compared to the 1:1 minting rate.
 *
 * For stable pools, we query the actual getAmountOut function to get the real
 * exchange rate, since the simple reserve ratio doesn't reflect the StableSwap curve.
 *
 * A discount exists when 1 VELO can buy MORE than 1 haiVELO on the market.
 */
export function useHaiVeloPoolDiscount(): HaiVeloPoolDiscountResult {
    const poolAddress = haiVeloVeloLpConfig.tvl?.poolAddress

    // Get pool contract to call getAmountOut
    const poolContract = useContract(poolAddress, POOL_ABI)

    // Query the actual swap rate from the pool
    const { data: amountOut, isLoading } = useQuery({
        queryKey: ['haiVeloPoolDiscount', poolAddress],
        queryFn: async () => {
            if (!poolContract) throw new Error('No pool contract')

            // Get how much haiVELO we get for 1 VELO
            const result = await poolContract.getAmountOut(QUOTE_AMOUNT, VELO_TOKEN_ADDRESS)
            return result.toString()
        },
        enabled: Boolean(poolContract),
        staleTime: 30_000, // 30 seconds
        refetchInterval: 60_000, // 1 minute
    })

    const result = useMemo<HaiVeloPoolDiscountResult>(() => {
        const swapLink = `https://velodrome.finance/swap?from=${VELO_TOKEN_ADDRESS}&to=${HAI_VELO_V2_TOKEN_ADDRESS}`

        // Default result when loading or no data
        const defaultResult: HaiVeloPoolDiscountResult = {
            loading: isLoading,
            hasDiscount: false,
            discountPercent: 0,
            marketRate: 1,
            swapLink,
        }

        if (isLoading || !amountOut) {
            return defaultResult
        }

        // Convert the output amount to a human-readable number
        // This is how much haiVELO you get for 1 VELO
        const haiVeloPerVelo = Number(formatUnits(amountOut, 18))

        // If haiVeloPerVelo > 1, you get more than 1 haiVELO per VELO = discount
        // e.g., if haiVeloPerVelo = 1.05, you get 5% more haiVELO than minting 1:1
        const discountPercent = haiVeloPerVelo > 1 ? (haiVeloPerVelo - 1) * 100 : 0

        // Only show discount if it exceeds threshold
        const hasDiscount = discountPercent >= DISCOUNT_THRESHOLD_PERCENT

        return {
            loading: false,
            hasDiscount,
            discountPercent,
            marketRate: haiVeloPerVelo,
            swapLink,
        }
    }, [amountOut, isLoading])

    return result
}

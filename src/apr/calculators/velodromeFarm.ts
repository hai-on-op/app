import { formatUnits } from 'ethers/lib/utils'
import type { AprComponent } from '../types'

interface VelodromeFarmInput {
    emissionsRaw: string // raw emissions from pool
    decimals: number
    veloPrice: number
    poolTvlUsd: number
}

interface VelodromeFarmResult {
    baseApr: number // decimal
    components: AprComponent[]
    boost: null
    tvl: number
    userPosition: number
}

/**
 * Velodrome Farm strategy APR.
 *
 * Formula:
 *   veloAPR = (emissionsPerSecond * 86400 * 365 * veloPrice) / poolTvl
 *
 * Already outputs decimal.
 */
export function calculateVelodromeFarmApr(
    input: VelodromeFarmInput & { userPositionUsd: number }
): VelodromeFarmResult {
    const { emissionsRaw, decimals, veloPrice, poolTvlUsd, userPositionUsd } = input

    const emissionsPerSecond = parseFloat(formatUnits(emissionsRaw, decimals))
    const baseApr = poolTvlUsd > 0 ? (365 * emissionsPerSecond * veloPrice * 86400) / poolTvlUsd : 0

    return {
        baseApr,
        components: [
            {
                source: 'velo-emissions',
                apr: baseApr,
                boosted: false,
                label: 'VELO Emissions',
            },
        ],
        boost: null,
        tvl: poolTvlUsd,
        userPosition: userPositionUsd,
    }
}

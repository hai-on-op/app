import { useQuery } from '@apollo/client'

import { OPTIMISM_UNISWAP_POOL_QUERY, type QueryLiquidityPool, REWARDS, uniClient } from '~/utils'
import { type VelodromeLpData, useVelodrome } from '~/hooks'

export type PoolAnalytics = {
    uniPools: QueryLiquidityPool[]
    veloPools: VelodromeLpData[]
    loading: boolean
    error: string
}

const uniHaiWethPool1Percent = '0x2A087fd694DeBec1ED61E0740BD0810b804da8f0'.toLowerCase()

export function usePoolAnalytics() {
    const {
        data: uniData,
        loading: uniLoading,
        error: uniError,
    } = useQuery<{ liquidityPools: QueryLiquidityPool[] }>(OPTIMISM_UNISWAP_POOL_QUERY, {
        client: uniClient,
        variables: {
            ids: [...Object.keys(REWARDS.uniswap), uniHaiWethPool1Percent],
        },
    })

    const { data: veloData, loading: veloLoading, error: veloError } = useVelodrome()

    return {
        uniPools: uniData?.liquidityPools || [],
        veloPools: veloData || [],
        loading: uniLoading || veloLoading,
        error: uniError?.message || veloError,
    } as PoolAnalytics
}

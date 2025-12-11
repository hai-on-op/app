import { BigNumber } from 'ethers'
import { getAddress } from 'ethers/lib/utils'
import { useQuery } from '@tanstack/react-query'

import sugarAbi from '~/abis/velo_sugar.abi.json'
import { useContract } from './useContract'
import { useAccount } from 'wagmi'

import { HAI_ADDRESS, KITE_ADDRESS, VELO_SUGAR_ADDRESS } from '~/utils'

export type VelodromeLpData = {
    tokenPair: [string, string]
    address: string
    symbol: string
    decimals: number
    liquidity: string
    type: string
    token0: string
    reserve0: string
    staked0: string
    token1: string
    reserve1: string
    staked1: string
    gauge_liquidity: string
    emissions: string
    // Fee-related fields for trading fee APR calculation
    pool_fee: string // Fee rate in basis points (e.g., 5 = 0.05%)
    unstaked_fee: string // Fee rate for unstaked LPs
    token0_fees: string // Accumulated fees in token0
    token1_fees: string // Accumulated fees in token1
}

export function useVelodrome() {
    const velodromeSugarContract = useContract(VELO_SUGAR_ADDRESS, sugarAbi)

    const query = useQuery<VelodromeLpData[], Error>(
        ['velodrome', 'pools'],
        async () => {
            if (!velodromeSugarContract) throw new Error('No contract')
            // Single targeted call to avoid overlapping scans
            const lps = (await velodromeSugarContract.all(BigNumber.from(500), BigNumber.from(800))) as any[]
            const targetTokens = [getAddress(HAI_ADDRESS), getAddress(KITE_ADDRESS)]

            // Base filter: pools that involve HAI or KITE by address (existing behavior)
            const addressFiltered = lps.filter((lp) => targetTokens.includes(lp[7]) || targetTokens.includes(lp[10]))

            // Additional filter: include haiVELO pools by symbol (e.g. HAIVELO/VELO, HAIVELOV2/VELO)
            const haiVeloSymbolFiltered = lps.filter((lp) => {
                const symbol: string = lp[1]
                const upper = symbol.toUpperCase()
                return upper.includes('HAIVELO')
            })

            // Merge and dedupe by LP address
            const merged: any[] = [...addressFiltered, ...haiVeloSymbolFiltered]
            const uniqueByAddress: any[] = []
            const seen = new Set<string>()
            for (const lp of merged) {
                const key = (lp.lp as string).toLowerCase()
                if (!seen.has(key)) {
                    seen.add(key)
                    uniqueByAddress.push(lp)
                }
            }

            const lpData: VelodromeLpData[] = uniqueByAddress.map((lp) => ({
                tokenPair: lp[1]
                    .split('/')
                    .map((token: string) => token.replace(/^[v|s]AMMV2-/gi, '').toUpperCase()) as [string, string],
                address: lp.lp as string,
                symbol: lp.symbol as string,
                decimals: lp.decimals as number,
                liquidity: lp.liquidity as string,
                type: lp.type as string,
                token0: lp.token0 as string,
                reserve0: lp.reserve0 as string,
                staked0: lp.staked0 as string,
                token1: lp.token1 as string,
                reserve1: lp.reserve1 as string,
                staked1: lp.staked1 as string,
                gauge_liquidity: lp.gauge_liquidity as string,
                emissions: lp.emissions as string,
                // Fee-related fields
                pool_fee: lp.pool_fee?.toString() ?? '0',
                unstaked_fee: lp.unstaked_fee?.toString() ?? '0',
                token0_fees: lp.token0_fees?.toString() ?? '0',
                token1_fees: lp.token1_fees?.toString() ?? '0',
            }))
            return lpData
        },
        {
            enabled: Boolean(velodromeSugarContract),
            staleTime: 60_000,
            keepPreviousData: true,
        }
    )

    return {
        data: query.data,
        loading: query.isLoading,
        error: query.error?.message,
        refetch: query.refetch,
    }
}

export type VelodromeLpPosition = {
    lp: string
    liquidity: string
    staked0: string
    staked1: string
    emissions_earned: string
}

export function useVelodromePositions() {
    const { address } = useAccount()
    const velodromeSugarContract = useContract(VELO_SUGAR_ADDRESS, sugarAbi)

    const query = useQuery<VelodromeLpPosition[], Error>(
        ['velodrome', 'positions', address],
        async () => {
            if (!address || !velodromeSugarContract) throw new Error('Missing deps')
            const positions = (await velodromeSugarContract.positions(
                BigNumber.from(800),
                BigNumber.from(700),
                address
            )) as any[]
            const positionData = positions.map((position) => ({
                lp: position.lp,
                liquidity: position.liquidity.toString(),
                staked0: position.staked0.toString(),
                staked1: position.staked1.toString(),
                emissions_earned: position.emissions_earned.toString(),
            }))
            return positionData
        },
        {
            enabled: Boolean(velodromeSugarContract),
            staleTime: 20_000,
            keepPreviousData: true,
        }
    )

    return {
        data: query.data,
        loading: query.isLoading,
        error: query.error?.message,
        refetch: query.refetch,
    }
}

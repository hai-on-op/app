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
}

export function useVelodrome() {
    const velodromeSugarContract = useContract(VELO_SUGAR_ADDRESS, sugarAbi)

    const query = useQuery<VelodromeLpData[], Error>(
        ['velodrome', 'pools'],
        async () => {
            if (!velodromeSugarContract) throw new Error('No contract')
            // Single targeted call to avoid overlapping scans
            const lps = (await velodromeSugarContract.all(
                BigNumber.from(500),
                BigNumber.from(800)
            )) as any[]
            const targetTokens = [getAddress(HAI_ADDRESS), getAddress(KITE_ADDRESS)]
            const filtered = lps.filter((lp) => targetTokens.includes(lp[7]) || targetTokens.includes(lp[10]))
            const lpData = filtered.map((lp) => ({
                tokenPair: lp[1].split('/').map((token: string) => token.replace(/^[v|s]AMMV2-/gi, '').toUpperCase()),
                address: lp.lp,
                symbol: lp.symbol,
                decimals: lp.decimals,
                liquidity: lp.liquidity,
                type: lp.type,
                token0: lp.token0,
                reserve0: lp.reserve0,
                staked0: lp.staked0,
                token1: lp.token1,
                reserve1: lp.reserve1,
                staked1: lp.staked1,
                gauge_liquidity: lp.gauge_liquidity,
                emissions: lp.emissions,
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
        error: query.error?.message || '',
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
            enabled: Boolean(velodromeSugarContract && address),
            staleTime: 20_000,
            keepPreviousData: true,
        }
    )

    return {
        data: query.data,
        loading: query.isLoading,
        error: query.error?.message || '',
        refetch: query.refetch,
    }
}

import { useQuery } from '@tanstack/react-query'
import { fetchHaiVeloLatestTransferAmount, HAI_REWARD_DISTRIBUTOR_ADDRESS } from '~/services/haiVeloService'
import { HAI_AERO_DEPOSITER_ADDRESS } from '~/services/minterProtocol/registry'
import { VITE_MAINNET_PUBLIC_RPC } from '~/utils'

const HAI_TOKEN_ADDRESS = import.meta.env.VITE_HAI_ADDRESS as string

/**
 * React Query wrapper for fetching weekly HAI reward transfer amount.
 * Replaces the useEffect + useState pattern in useStrategyData.
 */
export function useWeeklyHaiRewardForHaiVelo() {
    return useQuery({
        queryKey: ['apr', 'weeklyHaiReward', 'haivelo'],
        queryFn: () =>
            fetchHaiVeloLatestTransferAmount({
                rpcUrl: VITE_MAINNET_PUBLIC_RPC,
                haiTokenAddress: HAI_TOKEN_ADDRESS,
            }),
        staleTime: 5 * 60_000,
    })
}

export function useWeeklyHaiRewardForHaiAero() {
    return useQuery({
        queryKey: ['apr', 'weeklyHaiReward', 'haiaero'],
        queryFn: () =>
            fetchHaiVeloLatestTransferAmount({
                rpcUrl: VITE_MAINNET_PUBLIC_RPC,
                haiTokenAddress: HAI_TOKEN_ADDRESS,
                depositerAddress: HAI_AERO_DEPOSITER_ADDRESS,
                distributorAddress: HAI_REWARD_DISTRIBUTOR_ADDRESS,
            }),
        staleTime: 5 * 60_000,
    })
}

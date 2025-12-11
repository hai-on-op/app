import React, { createContext, useContext, useMemo } from 'react'
import { useAccount, useNetwork } from 'wagmi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePublicProvider , useEthersSigner } from '~/hooks'
import { getTotalStaked } from '~/services/stakingService'
import { getApy, getUserRewards } from '~/services/rewards/stakingRewardsService'
import { getDistributorTimer, getUserIncentives } from '~/services/rewards/incentivesDistributorService'
import { getVaultSchedule, computeVaultApr } from '~/services/rewards/vaultRewardsService'
import { computeHaiVeloBoostApr, computeVaultBoostApr } from '~/services/rewards/boostService'
import type { Address, AggregatedReward, IncentiveClaimData, StakingApyItem, BasisPointsNumber, VaultRewardSchedule } from '~/types/rewards'

type StakingSlice = {
	apy: { data: StakingApyItem[] | undefined; loading: boolean; refetch: () => void }
	tvl: { data: string | undefined; loading: boolean; refetch: () => void }
	userRewards: { data: AggregatedReward[] | undefined; loading: boolean; refetch: () => void }
}

type IncentivesSlice = {
	claims: { data: Record<string, IncentiveClaimData> | undefined; loading: boolean; refetch: () => void }
	timer: { data: { endTime: number; paused: boolean } | undefined; loading: boolean; refetch: () => void }
}

type VaultsSlice = {
	getSchedule: (symbol: string) => VaultRewardSchedule[]
	computeApr: (params: { schedule: VaultRewardSchedule[]; totalBoostedValueUsd: number }) => BasisPointsNumber
}

type BoostsSlice = {
	computeHaiVeloBoostApr: typeof computeHaiVeloBoostApr
 	computeVaultBoostApr: typeof computeVaultBoostApr
}

type RewardsContextValue = {
	staking: StakingSlice
	incentives: IncentivesSlice
	vaults: VaultsSlice
	boosts: BoostsSlice
}

const RewardsContext = createContext<RewardsContextValue | undefined>(undefined)

export function RewardsProvider({ children }: { children: React.ReactNode }) {
    const { address } = useAccount()
    const { chain } = useNetwork()
    const chainId = chain?.id || 10

    const provider = usePublicProvider()
    const signer = useEthersSigner()
    const queryClient = useQueryClient()

    const apyQuery = useQuery<StakingApyItem[]>({
 		queryKey: ['rewards', 'staking', 'apy'],
 		enabled: Boolean(provider),
 		queryFn: async () => {
 			if (!provider) throw new Error('No provider')
 			return getApy(provider)
 		},
 		staleTime: 30_000,
 	})

    const tvlQuery = useQuery<string>({
 		queryKey: ['rewards', 'staking', 'tvl'],
 		enabled: Boolean(provider),
 		queryFn: async () => {
 			if (!provider) throw new Error('No provider')
 			return getTotalStaked(provider)
 		},
 		staleTime: 15_000,
 	})

 	const userRewardsQuery = useQuery<AggregatedReward[]>({
 		queryKey: ['rewards', 'staking', 'userRewards', address],
 		enabled: Boolean(provider && address),
 		queryFn: async () => {
 			if (!provider || !address) throw new Error('Missing deps')
 			return getUserRewards(address as Address, provider)
 		},
 		staleTime: 30_000,
 	})

 	const incentivesTimerQuery = useQuery<{ endTime: number; paused: boolean}>({
 		queryKey: ['rewards', 'incentives', 'timer', chainId],
 		enabled: Boolean(provider || signer),
 		queryFn: async () => {
 			const reader = signer || (provider as any)
 			return getDistributorTimer(reader)
 		},
 		staleTime: 30_000,
 	})

 	const incentivesClaimsQuery = useQuery<Record<string, IncentiveClaimData>>({
 		queryKey: ['rewards', 'incentives', 'claims', address, chainId],
 		enabled: Boolean((provider || signer) && address),
 		queryFn: async () => {
 			const reader = (signer as any) || (provider as any)
 			return getUserIncentives(address as Address, chainId, reader)
 		},
 		staleTime: 15_000,
 	})

 	const rewardsValue: RewardsContextValue = useMemo(() => {
 		return {
 			staking: {
 				apy: {
 					data: apyQuery.data,
 					loading: apyQuery.isLoading,
 					refetch: () => queryClient.invalidateQueries({ queryKey: ['rewards', 'staking', 'apy'] }),
 				},
 				tvl: {
 					data: tvlQuery.data,
 					loading: tvlQuery.isLoading,
 					refetch: () => queryClient.invalidateQueries({ queryKey: ['rewards', 'staking', 'tvl'] }),
 				},
 				userRewards: {
 					data: userRewardsQuery.data,
 					loading: userRewardsQuery.isLoading,
 					refetch: () => queryClient.invalidateQueries({ queryKey: ['rewards', 'staking', 'userRewards', address] }),
 				},
 			},
 			incentives: {
 				claims: {
 					data: incentivesClaimsQuery.data,
 					loading: incentivesClaimsQuery.isLoading,
 					refetch: () => queryClient.invalidateQueries({ queryKey: ['rewards', 'incentives', 'claims', address, chainId] }),
 				},
 				timer: {
 					data: incentivesTimerQuery.data,
 					loading: incentivesTimerQuery.isLoading,
 					refetch: () => queryClient.invalidateQueries({ queryKey: ['rewards', 'incentives', 'timer', chainId] }),
 				},
 			},
 			vaults: {
 				getSchedule: (symbol: string) => getVaultSchedule(symbol),
 				computeApr: ({ schedule, totalBoostedValueUsd }) => computeVaultApr({ schedule, totalBoostedValueUsd }),
 			},
 			boosts: {
 				computeHaiVeloBoostApr,
 				computeVaultBoostApr,
 			},
 		}
 	}, [apyQuery.data, apyQuery.isLoading, tvlQuery.data, tvlQuery.isLoading, userRewardsQuery.data, userRewardsQuery.isLoading, incentivesClaimsQuery.data, incentivesClaimsQuery.isLoading, incentivesTimerQuery.data, incentivesTimerQuery.isLoading, address, chainId, queryClient])

 	return <RewardsContext.Provider value={rewardsValue}>{children}</RewardsContext.Provider>
}

export function useRewards() {
 	const ctx = useContext(RewardsContext)
 	if (!ctx) {
 		throw new Error('useRewards must be used within RewardsProvider')
 	}
 	return ctx
}



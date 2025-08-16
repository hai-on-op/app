import { useQuery } from '@tanstack/react-query'
import { usePublicProvider } from '~/hooks'
import { getStakingApy, type StakingApy } from '~/services/rewardsService'

export function useStakingApy() {
    const provider = usePublicProvider()
    return useQuery<StakingApy[]>({
        queryKey: ['stake', 'apy'],
        enabled: !!provider,
        queryFn: async () => {
            if (!provider) throw new Error('No provider')
            return getStakingApy(provider)
        },
        staleTime: 30_000,
    })
}



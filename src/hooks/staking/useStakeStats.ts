import { useQuery } from '@tanstack/react-query'
import { usePublicProvider } from '~/hooks'
import { getTotalStaked } from '~/services/stakingService'

export type StakeStats = {
    totalStaked: string
    totalStakers?: number
}

export function useStakeStats() {
    const provider = usePublicProvider()

    return useQuery<StakeStats>({
        queryKey: ['stake', 'stats'],
        enabled: !!provider,
        queryFn: async () => {
            if (!provider) throw new Error('No provider')
            const totalStaked = await getTotalStaked(provider)
            return { totalStaked }
        },
        staleTime: 15_000,
    })
}



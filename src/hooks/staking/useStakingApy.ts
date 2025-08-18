import { useQuery } from '@tanstack/react-query'
import { usePublicProvider } from '~/hooks'
import { utils } from 'ethers'
import { getApy } from '~/services/rewards/stakingRewardsService'

export function useStakingApy() {
    const provider = usePublicProvider()
    return useQuery<{ id: number; rpToken: string; rpRate: any }[]>({
        queryKey: ['stake', 'apy'],
        enabled: !!provider,
        queryFn: async () => {
            if (!provider) throw new Error('No provider')
            // adapt new service shape to legacy consumer shape (rpRate as BigNumber)
            const apy = await getApy(provider)
            return apy.map((item) => ({ id: item.id, rpToken: item.rpToken, rpRate: utils.parseUnits(String(item.rpRateWei || '0'), 18) }))
        },
        staleTime: 30_000,
    })
}



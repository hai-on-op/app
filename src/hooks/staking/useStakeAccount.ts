import { useQuery } from '@tanstack/react-query'
import { usePublicProvider } from '~/hooks'
import type { Address } from '~/services/stakingService'
import { defaultStakingService } from '~/services/stakingService'

export type StakeAccountData = {
    stakedBalance: string
    pendingWithdrawal: { amount: string; timestamp: number } | null
    rewards: Array<{ tokenAddress: Address; amount: string }>
    cooldown: number
}

export function useStakeAccount(address?: Address, namespace: string = 'kite', service = defaultStakingService) {
    const provider = usePublicProvider()

    const query = useQuery<StakeAccountData>({
        queryKey: ['stake', namespace, 'account', address?.toLowerCase()],
        enabled: !!provider,
        queryFn: async () => {
            const [stakedBalance, pendingWithdrawal, rewards, cooldown] = await Promise.all([
                service.getStakedBalance(address, provider),
                service.getPendingWithdrawal(address, provider),
                service.getRewards(address, provider),
                service.getCooldown(provider),
            ])
            return { stakedBalance, pendingWithdrawal, rewards, cooldown }
        },
    })

    return query
}

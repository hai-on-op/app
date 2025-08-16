import { useQuery } from '@tanstack/react-query'
import { usePublicProvider } from '~/hooks'
import type { Address } from '~/services/stakingService'
import {
    getCooldown,
    getRewards,
    getStakedBalance,
    getPendingWithdrawal,
} from '~/services/stakingService'

export type StakeAccountData = {
    stakedBalance: string
    pendingWithdrawal: { amount: string; timestamp: number } | null
    rewards: Array<{ tokenAddress: Address; amount: string }>
    cooldown: number
}

export function useStakeAccount(address?: Address) {
    const provider = usePublicProvider()

    const query = useQuery<StakeAccountData>({
        queryKey: ['stake', 'account', address?.toLowerCase() || '0x0'],
        enabled: !!provider && !!address,
        queryFn: async () => {
            if (!provider || !address) throw new Error('No provider or address')
            const [stakedBalance, pendingWithdrawal, rewards, cooldown] = await Promise.all([
                getStakedBalance(address, provider),
                getPendingWithdrawal(address, provider),
                getRewards(address, provider),
                getCooldown(provider),
            ])
            return { stakedBalance, pendingWithdrawal, rewards, cooldown }
        },
    })

    return query
}



import type { StakingConfig, Address } from '~/types/stakingConfig'
import { useStakeAccount } from '~/hooks/staking/useStakeAccount'
import { useStakeStats } from '~/hooks/staking/useStakeStats'
import { useStakeMutations } from '~/hooks/staking/useStakeMutations'
import { useStakingSummary } from '~/hooks/useStakingSummary'
import { buildStakingService } from '~/services/stakingService'

export function createStakingClient(config: StakingConfig) {
    const service = buildStakingService(config.addresses.manager as any, undefined, config.decimals)
    const keys = {
        account: (addr?: Address) => ['stake', config.namespace, 'account', (addr || '0x0').toLowerCase()] as const,
        stats: ['stake', config.namespace, 'stats'] as const,
    }

    return {
        keys,
        useAccount: () => useStakeAccount(undefined, config.namespace, service),
        useStats: () => useStakeStats(config.namespace, service),
        useMutations: () => useStakeMutations(undefined, config.namespace, service),
        useSummary: () => useStakingSummary(),
        service,
    }
}



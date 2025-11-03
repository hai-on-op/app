import type { StakingConfig, Address } from '~/types/stakingConfig'
import { useStakeAccount } from '~/hooks/staking/useStakeAccount'
import { useStakeStats } from '~/hooks/staking/useStakeStats'
import { useStakeMutations } from '~/hooks/staking/useStakeMutations'
import { useStakingSummary } from '~/hooks/useStakingSummary'
import * as stakingService from '~/services/stakingService'

export function createStakingClient(config: StakingConfig) {
    const keys = {
        account: (addr?: Address) => ['stake', config.namespace, 'account', (addr || '0x0').toLowerCase()] as const,
        stats: ['stake', config.namespace, 'stats'] as const,
    }

    return {
        keys,
        useAccount: () => useStakeAccount(undefined, config.namespace),
        useStats: () => useStakeStats(config.namespace),
        useMutations: () => useStakeMutations(undefined, config.namespace),
        useSummary: () => useStakingSummary(),
        service: stakingService,
    }
}



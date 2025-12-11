import type { StakingConfig, Address } from '~/types/stakingConfig'
import { useStakeAccount } from '~/hooks/staking/useStakeAccount'
import { useStakeStats } from '~/hooks/staking/useStakeStats'
import { useStakeMutations } from '~/hooks/staking/useStakeMutations'
import { useStakingSummary } from '~/hooks/useStakingSummary'
import { buildStakingService } from '~/services/stakingService'
import { stakeQueryKeys } from '~/hooks/staking/stakeQueryKeys'

export function createStakingClient(config: StakingConfig) {
    const service = buildStakingService(config.addresses.manager as any, undefined, config.decimals)
    const keys = {
        account: (addr?: Address) => stakeQueryKeys.account(config.namespace, addr),
        stats: stakeQueryKeys.stats(config.namespace),
    }

    return {
        keys,
        useAccount: () => useStakeAccount(undefined, config.namespace, service),
        useStats: () => useStakeStats(config.namespace, service),
        useMutations: () => useStakeMutations(undefined, config.namespace ?? 'kite', service),
        useSummary: () => useStakingSummary(),
        service,
    }
}



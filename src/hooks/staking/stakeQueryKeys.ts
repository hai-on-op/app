import type { Address, StakingUserEntity } from '~/types/stakingConfig'

/**
 * Canonical React Query keys for staking data.
 *
 * Keep this module small and dependency-free so it can be reused from hooks,
 * services, and tests without creating cycles.
 */
export const stakeQueryKeys = {
    account(namespace: string, address?: Address) {
        const addr = (address ?? '0x0').toLowerCase()
        return ['stake', namespace, 'account', addr] as const
    },

    stats(namespace: string) {
        return ['stake', namespace, 'stats'] as const
    },

    /**
     * Base key for any pending-withdrawal queries in a namespace.
     * Use this when you want to broadly invalidate all pending queries
     * for a staking pool (e.g. after a mutation).
     */
    pendingBase(namespace: string) {
        return ['stake', namespace, 'pending'] as const
    },

    /**
     * Pending-withdrawal queries scoped to an address only.
     * This matches any query whose key starts with this prefix
     * (e.g. per-entity pending queries).
     */
    pendingForAddress(namespace: string, address?: string | Address) {
        const addr = (address ?? '').toLowerCase()
        return ['stake', namespace, 'pending', addr] as const
    },

    /**
     * Fully-qualified pending-withdrawal query key including the subgraph
     * user entity discriminator. This is the key shape used by
     * useStakePendingWithdrawalQuery.
     */
    pendingForAddressAndEntity(
        namespace: string,
        address: string | Address | undefined,
        userEntity: StakingUserEntity
    ) {
        const addr = (address ?? '').toLowerCase()
        return ['stake', namespace, 'pending', addr, userEntity] as const
    },
}



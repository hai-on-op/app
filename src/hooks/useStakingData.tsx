import { useStaking } from '~/providers/StakingProvider'

/**
 * This hook is maintained for backward compatibility.
 * Use useStaking directly from StakingProvider for new code.
 */
export function useStakingData() {
    return useStaking()
}

// Re-export everything from the provider
export * from '~/providers/StakingProvider'

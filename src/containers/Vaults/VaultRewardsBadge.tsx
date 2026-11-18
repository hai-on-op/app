import type { RewardToken } from '~/types/rewards'
import { RewardsTokenArray } from '~/components/TokenArray'
import { getVaultSchedule } from '~/services/rewards/vaultRewardsService'

export function VaultRewardsBadge({ collateral }: { collateral: string }) {
    const borrowTokens = getVaultSchedule(collateral).map(({ token }) => token)
    const earnsHaiOnDeposit = ['HAIVELO', 'HAIVELOV2', 'HAIAERO'].includes(collateral)
    if (!earnsHaiOnDeposit && !borrowTokens.length) return null

    const tokens: RewardToken[] = earnsHaiOnDeposit ? ['HAI', ...borrowTokens] : borrowTokens
    const tooltip = [
        earnsHaiOnDeposit && 'Earn HAI from voting rewards on deposited collateral.',
        borrowTokens.length > 0 && `Earn ${borrowTokens.join(' and ')} for borrowing HAI against this asset.`,
    ]
        .filter(Boolean)
        .join(' ')

    return <RewardsTokenArray tokens={tokens} label="EARN" tooltip={tooltip} />
}

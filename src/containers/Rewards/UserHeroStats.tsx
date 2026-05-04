import type { AggregatedUser } from './types'
import { formatRewardAmount, formatShare, formatBoost, calcAverageBoost } from './utils'
import { returnWalletAddress } from '~/utils'

import { Stats, Stat } from '~/components/Stats'
import { Section, SectionHeader } from './index'

type Props = {
    user: AggregatedUser
    totalDays: number
}

export function UserHeroStats({ user, totalDays }: Props) {
    const avgBoost = calcAverageBoost(user.avgBoosts)
    const tokenEntries = Object.entries(user.avgDailyEarnedByToken)
    const totalStats = tokenEntries.length + 4 // tokens + days + boost + staked + share

    return (
        <Section>
            <SectionHeader>USER: {returnWalletAddress(user.address)}</SectionHeader>
            <Stats fun columns={`repeat(${totalStats}, 1fr)`}>
                {tokenEntries.map(([token, value]) => (
                    <Stat
                        key={token}
                        stat={{
                            header: formatRewardAmount(value),
                            label: `Avg Daily ${token}`,
                        }}
                    />
                ))}
                <Stat
                    stat={{
                        header: `${user.daysActive} / ${totalDays}`,
                        label: 'Days Active',
                    }}
                />
                <Stat
                    stat={{
                        header: formatBoost(avgBoost),
                        label: 'Avg Boost',
                    }}
                />
                <Stat
                    stat={{
                        header: formatRewardAmount(user.avgKiteStaked),
                        label: 'KITE Staked',
                    }}
                />
                <Stat
                    stat={{
                        header: formatShare(user.avgKiteShare),
                        label: 'KITE Pool Share',
                    }}
                />
            </Stats>
        </Section>
    )
}

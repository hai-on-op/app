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

    return (
        <Section>
            <SectionHeader>USER: {returnWalletAddress(user.address)}</SectionHeader>
            <Stats fun>
                <Stat
                    stat={{
                        header: formatRewardAmount(user.avgDailyEarnedByToken.HAI || 0),
                        label: 'Avg Daily HAI',
                    }}
                />
                <Stat
                    stat={{
                        header: formatRewardAmount(user.avgDailyEarnedByToken.KITE || 0),
                        label: 'Avg Daily KITE',
                    }}
                />
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

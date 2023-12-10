import { HaiButton } from '~/styles'
import { RewardsTokenPair } from '~/components/TokenPair'
import { Stats, type StatProps } from '~/components/Stats'

const dummyStats: StatProps[] = [
    {
        header: '$45,600',
        label: 'My Farm TVL',
        tooltip: 'Hello World',
    },
    {
        header: '7.8%',
        label: 'My Net Farm APY',
        tooltip: 'Hello World',
    },
    {
        header: '$7,000',
        headerStatus: (
            <RewardsTokenPair
                tokens={['OP', 'KITE']}
                hideLabel
            />
        ),
        label: 'My Farm Rewards',
        tooltip: 'Hello World',
        button: <HaiButton $variant="yellowish">Claim</HaiButton>,
    },
]

export function EarnStats() {
    // TODO: dynamically calculate stats
    return (
        <Stats stats={dummyStats}/>
    )
}

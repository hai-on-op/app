import { HaiButton } from '~/styles'
import { RewardsTokenPair } from '~/components/TokenPair'
import { Stats, type StatProps } from '~/components/Stats'

const dummyStats: StatProps[] = [
    {
        header: '7',
        label: 'My Active Bids',
        tooltip: 'Hello World'
    },
    {
        header: '$45,600',
        label: 'My Active Bids Value',
        tooltip: 'Hello World'
    },
    {
        header: '$7,000',
        headerStatus: (
            <RewardsTokenPair
                tokens={['OP', 'KITE']}
                hideLabel
            />
        ),
        label: 'My Auction Winnings',
        tooltip: 'Hello World',
        button: <HaiButton $variant="yellowish">Claim</HaiButton>
    }
]

export function AuctionStats() {
    // TODO: dynamically calculate stats
    return (
        <Stats
            stats={dummyStats}
            columns="repeat(3, 1fr)"
        />
    )
}
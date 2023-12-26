import { useStoreActions } from '~/store'

import { HaiButton } from '~/styles'
import { RewardsTokenPair } from '~/components/TokenPair'
import { Stats, type StatProps } from '~/components/Stats'

export function AuctionStats() {
    const { popupsModel: popupsActions } = useStoreActions(actions => actions)

    // TODO: dynamically calculate stats
    const dummyStats: StatProps[] = [
        {
            header: '7',
            label: 'My Active Bids',
            tooltip: 'Hello World',
        },
        {
            header: '$45,600',
            label: 'My Active Bids Value',
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
            label: 'My Claimable Assets',
            tooltip: 'Hello World',
            button: (
                <HaiButton
                    $variant="yellowish"
                    onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
                    Claim
                </HaiButton>
            ),
        },
    ]

    return (
        <Stats
            stats={dummyStats}
            columns="repeat(3, 1fr)"
        />
    )
}

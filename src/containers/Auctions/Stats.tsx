import { useAccount } from 'wagmi'

import { formatNumberWithStyle } from '~/utils'
import { useStoreActions } from '~/store'
import { useMyBids } from '~/hooks'

import { HaiButton } from '~/styles'
import { RewardsTokenPair } from '~/components/TokenPair'
import { Stats, type StatProps } from '~/components/Stats'

export function AuctionStats() {
    const { address } = useAccount()

    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const { activeBids, activeBidsValue } = useMyBids()
    // TODO: calculate claim stats
    const dummyStats: StatProps[] = [
        {
            header: activeBids.length,
            label: 'My Active Bids',
            tooltip: 'Number of your active bids placed in auctions',
        },
        {
            header: activeBidsValue ? formatNumberWithStyle(activeBidsValue, { style: 'currency' }) : '$--',
            label: 'My Active Bids Value',
            tooltip: 'Total dollar value of all your active bids placed in auctions',
        },
        {
            header: '$7,000',
            headerStatus: <RewardsTokenPair tokens={['OP', 'KITE']} hideLabel />,
            label: 'My Claimable Assets',
            tooltip: 'Claim assets purchased in auctions and/or rewards from earn strategies',
            button: (
                <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
                    Claim
                </HaiButton>
            ),
        },
    ]

    if (!address) return null

    return <Stats stats={dummyStats} columns="repeat(3, 1fr)" />
}

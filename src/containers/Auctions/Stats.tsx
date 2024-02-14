import { useAccount } from 'wagmi'

import { formatNumberWithStyle } from '~/utils'
// import { useStoreActions } from '~/store'
import { useMyBids } from '~/hooks'

import { HaiButton } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'

export function AuctionStats() {
    const { address } = useAccount()

    // const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const { activeBids, activeBidsValue, claimableAssetValue } = useMyBids()
    // TODO: calculate claim stats from auction results
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
            header: claimableAssetValue ? formatNumberWithStyle(claimableAssetValue, { style: 'currency' }) : '$--',
            headerStatus: <RewardsTokenArray tokens={['OP', 'KITE']} hideLabel />,
            label: 'My Claimable Assets',
            tooltip: 'Claim assets purchased in auctions',
            button: (
                <HaiButton $variant="yellowish" disabled>
                    Claim
                </HaiButton>
                // <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
                //     Claim
                // </HaiButton>
            ),
        },
    ]

    if (!address) return null

    return <Stats stats={dummyStats} columns="repeat(3, 1fr)" />
}

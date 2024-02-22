import { useAccount } from 'wagmi'

import { useStoreActions } from '~/store'
import { useClaims } from '~/providers/ClaimsProvider'

import { HaiButton } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'

export function AuctionStats() {
    const { address } = useAccount()

    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const { activeAuctions } = useClaims()

    const dummyStats: StatProps[] = [
        {
            header: activeAuctions.activeBids.length,
            label: 'My Active Bids',
            tooltip: 'Number of your active bids placed in auctions',
        },
        {
            header: activeAuctions.activeBidsValue.formatted,
            label: `My Active Bid Value`,
            tooltip: 'Total dollar value of all your active bids placed in auctions',
        },
        {
            header: activeAuctions.claimableAssetValue.formatted,
            headerStatus: <RewardsTokenArray tokens={['HAI', 'KITE', 'Collateral']} size={24} hideLabel />,
            label: 'My Claimable Assets',
            tooltip: 'Claim assets purchased in auctions',
            button: (
                <HaiButton
                    $variant="yellowish"
                    disabled={activeAuctions.claimableAssetValue.raw === '0'}
                    onClick={() => popupsActions.setIsClaimPopupOpen(true)}
                >
                    Claim
                </HaiButton>
            ),
        },
    ]

    if (!address) return null

    return <Stats stats={dummyStats} columns="repeat(3, 1fr)" fun />
}

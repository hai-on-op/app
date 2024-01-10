import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { useAccount } from 'wagmi'

import { MY_AUCTION_BIDS_QUERY, QueryEnglishAuctionBid } from '~/utils'

export function useMyBids() {
    const { address } = useAccount()

    const {
        data,
        loading,
        error,
    } = useQuery<{ englishAuctionBids: QueryEnglishAuctionBid[] }>(
        MY_AUCTION_BIDS_QUERY,
        {
            variables: { address },
            skip: !address,
        }
    )

    const activeBids = useMemo(() => (
        data?.englishAuctionBids.filter(({ auction }) => {
            const { auctionDeadline = '0', winner, isClaimed  } = auction || {}
            if (winner || isClaimed) return false
            if (parseInt(auctionDeadline) * 1000 < Date.now()) return false
            return true
        }) || []
    ), [data?.englishAuctionBids])

    const activeBidsValue = useMemo(() => (
        activeBids.reduce((value, bid) => {
            // TODO: fix valuing based on auction type
            return value + parseFloat(bid.buyAmount)
        }, 0)
    ), [activeBids])

    return {
        bids: data?.englishAuctionBids || [],
        activeBids,
        activeBidsValue,
        loading,
        error,
    }
}

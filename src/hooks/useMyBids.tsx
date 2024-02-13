import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { useAccount } from 'wagmi'

import { MY_AUCTION_BIDS_QUERY, QueryEnglishAuctionBid, stringsExistAndAreEqual, tokenMap } from '~/utils'
import { useStoreState } from '~/store'

export function useMyBids() {
    const { address } = useAccount()

    const {
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)

    const { data, loading, error } = useQuery<{ englishAuctionBids: QueryEnglishAuctionBid[] }>(MY_AUCTION_BIDS_QUERY, {
        variables: { address },
        skip: !address,
    })

    const activeBids = useMemo(
        () =>
            data?.englishAuctionBids.filter(({ auction }) => {
                const { auctionDeadline = '0', winner, isClaimed } = auction || {}
                if (winner || isClaimed) return false
                if (parseInt(auctionDeadline) * 1000 < Date.now()) return false
                return true
            }) || [],
        [data?.englishAuctionBids]
    )

    const activeBidsValue = useMemo(
        () =>
            activeBids.reduce((value, bid) => {
                // TODO: fix valuing based on auction type
                return value + parseFloat(bid.buyAmount)
            }, 0),
        [activeBids]
    )

    const claimableAuctions = useMemo(() => {
        return (
            data?.englishAuctionBids.filter(({ auction }) => {
                const { winner, isClaimed } = auction || {}
                if (!winner || isClaimed) return false
                return stringsExistAndAreEqual(winner, address)
            }) || []
        )
    }, [data?.englishAuctionBids, address])

    const claimableAssetValue = useMemo(() => {
        return claimableAuctions.reduce((total, { auction }) => {
            if (!auction) return total
            const { collateralLiquidationData, currentRedemptionPrice } = liquidationData || {}
            return total + tokenMap[auction.sellToken] === 'HAI'
                ? parseFloat(auction.sellAmount) * parseFloat(currentRedemptionPrice || '0')
                : parseFloat(auction.sellAmount) *
                      parseFloat(collateralLiquidationData?.[auction.sellToken]?.currentPrice.value || '0')
        }, 0)
    }, [claimableAuctions])

    return {
        bids: data?.englishAuctionBids || [],
        activeBids,
        activeBidsValue,
        claimableAuctions,
        claimableAssetValue,
        loading,
        error,
    }
}

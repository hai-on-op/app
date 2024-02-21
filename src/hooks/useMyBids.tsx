import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { useAccount } from 'wagmi'

import { MY_AUCTION_BIDS_QUERY, QueryEnglishAuctionBid, stringsExistAndAreEqual, tokenMap } from '~/utils'
import { useStoreState } from '~/store'

export function useMyBids() {
    const { address } = useAccount()

    const {
        auctionModel: { internalBalance, protInternalBalance },
        vaultModel: { liquidationData },
        connectWalletModel: { proxyAddress },
    } = useStoreState((state) => state)

    const { data, loading, error, refetch } = useQuery<{ englishAuctionBids: QueryEnglishAuctionBid[] }>(
        MY_AUCTION_BIDS_QUERY,
        {
            variables: { address: proxyAddress.toLowerCase() },
            skip: !proxyAddress,
        }
    )

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
                return stringsExistAndAreEqual(winner, address) || stringsExistAndAreEqual(winner, proxyAddress)
            }) || []
        )
    }, [data?.englishAuctionBids, address, proxyAddress])

    const claimableAssetValue = useMemo(() => {
        // console.log(claimableAuctions)
        const winnings = claimableAuctions.reduce((total, { sellAmount, auction }) => {
            if (!auction) return total
            const { collateralLiquidationData, currentRedemptionPrice } = liquidationData || {}
            const token = tokenMap[auction.sellToken] || auction.sellToken
            switch (token) {
                case 'HAI':
                    return total + parseFloat(sellAmount) * parseFloat(currentRedemptionPrice || '0')
                case 'KITE':
                    // TODO: get KITE price
                    return total + parseFloat(sellAmount) * 10
                default:
                    return (
                        total +
                        parseFloat(sellAmount) *
                            parseFloat(collateralLiquidationData?.[auction.sellToken]?.currentPrice.value || '0')
                    )
            }
        }, 0)
        return winnings + parseFloat(internalBalance) + 10 * parseFloat(protInternalBalance)
    }, [claimableAuctions, internalBalance, protInternalBalance])

    return {
        bids: data?.englishAuctionBids || [],
        activeBids,
        activeBidsValue,
        claimableAuctions,
        claimableAssetValue,
        loading,
        error,
        refetch,
    }
}
